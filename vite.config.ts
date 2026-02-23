import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { imagetools } from "vite-imagetools";

/**
 * Injects <link rel="preload"> for hero AVIF images into the built HTML.
 *
 * Problem: The hero image is imported in React JSX, so the browser can't discover
 * it until the entire JS bundle chain loads (HTML → main.js → Index.js → hero).
 * This creates a ~1.5s resource load delay on LCP.
 *
 * Solution: At build time, find the hero AVIF assets in the bundle, construct an
 * imagesrcset preload, and inject it into <head>. The browser discovers the image
 * immediately from the HTML, eliminating the JS-dependency chain delay.
 */
function heroPreloadPlugin(): Plugin {
  return {
    name: "hero-image-preload",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        // Only works during build when bundle is available
        if (!ctx.bundle) return [];

        // Find hero AVIF assets emitted by vite-imagetools and static imports
        const heroAvifs = Object.entries(ctx.bundle)
          .filter(
            ([key]) =>
              key.includes("hero-blockhaus") && key.endsWith(".avif")
          )
          .map(([key, chunk]) => ({
            path: "/" + key,
            // Determine byte size for sorting (smaller file = smaller dimensions)
            size:
              chunk.type === "asset" && chunk.source
                ? typeof chunk.source === "string"
                  ? chunk.source.length
                  : chunk.source.byteLength
                : 0,
          }))
          .sort((a, b) => a.size - b.size);

        if (heroAvifs.length === 0) return [];

        // Known responsive widths from HeroSection.tsx imports:
        // heroAvif480 (480w), heroAvif768 (768w), heroAvif1024 (1024w), heroAvifOriginal (1920w)
        const widths = [480, 768, 1024, 1920];

        // Map sorted-by-size assets to widths (smallest file = smallest width)
        const srcsetParts = heroAvifs.map(
          (file, i) =>
            `${file.path} ${widths[Math.min(i, widths.length - 1)]}w`
        );

        return [
          {
            tag: "link",
            attrs: {
              rel: "preload",
              as: "image",
              imagesrcset: srcsetParts.join(", "),
              imagesizes: "100vw",
              type: "image/avif",
              fetchpriority: "high",
            },
            injectTo: "head" as const,
          },
        ];
      },
    },
  };
}

/**
 * Converts the main CSS <link> to async loading to eliminate render-blocking.
 * Uses the media="print" swap trick: browser downloads CSS without blocking render,
 * then swaps to media="all" once loaded.
 *
 * Safe because index.html already has inline critical CSS covering:
 * - CSS variables (theme colors)
 * - Box-sizing, font-smoothing
 * - Loading skeleton with logo animation
 * - Font loading fallback (.font-loading class)
 */
function asyncCssPlugin(): Plugin {
  return {
    name: "async-css-loading",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        // Only transform in production builds
        return html.replace(
          /(<link\s+[^>]*rel="stylesheet"[^>]*href="\/assets\/[^"]*\.css"[^>]*)\/?\>/gi,
          (match, linkTag) => {
            const asyncLink = `${linkTag} media="print" onload="this.media='all'" />`;
            const noscriptFallback = `<noscript>${match}</noscript>`;
            return `${asyncLink}\n    ${noscriptFallback}`;
          }
        );
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.convex.cloud https://*.convex.dev https://checkout.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
        "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://*.convex.cloud https://*.convex.dev https://checkout.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
        "connect-src 'self' https://*.convex.cloud https://*.convex.dev wss://*.convex.cloud wss://*.convex.dev https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com https://*.clerk.accounts.dev https://*.clerk.dev https://*.clerk.com",
        "style-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https: https://*.convex.cloud https://img.clerk.com",
        "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://www.google.com https://maps.google.co.in https://maps.google.com",
        "worker-src 'self' blob: https://*.clerk.accounts.dev https://*.clerk.com",
        "child-src 'self' blob: https://*.clerk.accounts.dev https://*.clerk.com",
        "form-action 'self' https://checkout.razorpay.com",
        "base-uri 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests",
      ].join("; "),
    },
  },
  plugins: [
    react(),
    imagetools(), // Process images with query parameters for responsive sizes
    heroPreloadPlugin(), // Inject hero image preload for LCP optimization
    asyncCssPlugin(), // Convert CSS to non-render-blocking async loading
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target modern browsers for smaller bundles
    // ES2020 includes optional chaining, nullish coalescing, dynamic import
    target: "es2020",

    // Source maps only in development
    // Hidden source maps: generated but not referenced in output JS
    // Invisible to browsers but satisfies Lighthouse and enables error tracking (Sentry, etc.)
    sourcemap: mode === "development" ? true : "hidden",
    chunkSizeWarningLimit: 500,

    // Use esbuild minifier (default, built-in, very fast)
    // For terser, install it: npm install terser -D
    minify: "esbuild",

    // esbuild minification options
    esbuildOptions: {
      // Drop console.log in production
      drop: mode === "production" ? ["console", "debugger"] : [],
      // Keep important warnings/errors in production
      pure: mode === "production" ? ["console.log", "console.info"] : [],
      // Target modern browsers
      target: "es2020",
      // Legal comments handling
      legalComments: "none",
    },

    // Disable modulepreload polyfill - all modern browsers support it natively
    // This reduces bundle size by ~1KB
    modulePreload: {
      polyfill: false,
    },

    rollupOptions: {
      output: {
        // Entry file naming with hash for cache busting
        entryFileNames: "assets/[name]-[hash].js",

        // IMPORTANT: Do NOT use manualChunks for vendor splitting!
        // Manual chunking causes Temporal Dead Zone (TDZ) errors in production
        // because it breaks the natural initialization order that Rollup calculates.
        //
        // Symptoms when using manualChunks:
        // - "Cannot access 'X' before initialization"
        // - "Cannot set properties of undefined"
        //
        // Let Rollup handle code splitting naturally. It will:
        // 1. Create chunks based on dynamic imports (React.lazy, import())
        // 2. Properly order module initialization
        // 3. Deduplicate shared dependencies
        //
        // Code splitting still works via:
        // - Lazy routes in React Router
        // - React.lazy() for component code splitting
        // - Dynamic import() for deferred loading

        // Optimize chunk file naming for better caching
        chunkFileNames: (chunkInfo) => {
          // Use content hash for long-term caching
          return `assets/${chunkInfo.name}-[hash].js`;
        },

        // Asset file naming with hash
        assetFileNames: (assetInfo) => {
          // Separate images into their own directory
          if (assetInfo.name && /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetInfo.name)) {
            return "assets/images/[name]-[hash][extname]";
          }
          // Fonts
          if (assetInfo.name && /\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return "assets/fonts/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },

    // Optimize CSS
    cssCodeSplit: true,

    // Disable compressed size reporting in CI for faster builds
    // Enable locally for visibility: npm run build -- --mode development
    reportCompressedSize: !process.env.CI,

    // Increase chunk size limit for specific large chunks
    // This is a warning limit, not a hard limit
    assetsInlineLimit: 4096, // 4kb - inline small assets as base64
  },

  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@clerk/clerk-react",
      "convex/react",
      "@tanstack/react-query",
      // Include recharts and its dependencies to fix ESM/CJS compatibility
      // recharts has internal circular dependencies that need proper pre-bundling
      "recharts",
      "recharts/lib/index.js",
    ],
    // Force recharts to be treated as ESM to avoid TDZ issues
    esbuildOptions: {
      // Keep class names for proper initialization order
      keepNames: true,
    },
  },

  // CSS optimization
  css: {
    devSourcemap: mode === "development",
  },

  // Preview server configuration (for local production testing)
  preview: {
    port: 4173,
    strictPort: true,
  },
}));

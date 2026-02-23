import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { imagetools } from "vite-imagetools";

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
    sourcemap: mode === "development",
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

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

        // Improved chunking strategy for optimal caching and loading
        manualChunks: (id) => {
          // Core React ecosystem - loaded on every page
          if (id.includes("node_modules/react") ||
              id.includes("node_modules/react-dom") ||
              id.includes("node_modules/react-router-dom") ||
              id.includes("node_modules/scheduler")) {
            return "vendor-react";
          }

          // Radix UI components - frequently used UI primitives
          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }

          // Authentication - loaded early but can be deferred slightly
          if (id.includes("@clerk")) {
            return "vendor-clerk";
          }

          // Convex backend client
          if (id.includes("convex")) {
            return "vendor-convex";
          }

          // Charts library - ONLY loaded in admin dashboard
          // This is a significant bundle, so keeping it separate
          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }

          // Form handling - loaded on pages with forms
          if (id.includes("react-hook-form") ||
              id.includes("@hookform") ||
              id.includes("node_modules/zod")) {
            return "vendor-forms";
          }

          // Sentry error tracking - can be loaded after initial render
          if (id.includes("@sentry")) {
            return "vendor-sentry";
          }

          // Lucide icons - commonly used
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }

          // Date utilities (if used)
          if (id.includes("date-fns")) {
            return "vendor-date";
          }

          // TanStack Query - used for data fetching
          if (id.includes("@tanstack/react-query")) {
            return "vendor-query";
          }

          // Utility libraries - class-variance-authority, clsx, tailwind-merge
          if (id.includes("class-variance-authority") ||
              id.includes("clsx") ||
              id.includes("tailwind-merge")) {
            return "vendor-utils";
          }
        },

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
      // Include recharts and lodash to fix ESM/CJS compatibility
      // recharts uses lodash internally which needs proper CJS->ESM transformation
      "recharts",
      "lodash",
    ],
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

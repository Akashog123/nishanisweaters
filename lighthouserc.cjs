/**
 * Lighthouse CI Configuration
 *
 * This configuration defines performance budgets and assertions for key pages
 * in the e-commerce application. It runs as part of the CI/CD pipeline to
 * prevent performance regressions from reaching production.
 *
 * Core Web Vitals Targets:
 * - LCP (Largest Contentful Paint): < 2.5s
 * - FID (First Input Delay): < 100ms
 * - CLS (Cumulative Layout Shift): < 0.1
 * - Performance Score: > 80
 *
 * @see https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
 */

module.exports = {
  ci: {
    collect: {
      // Number of runs per URL - use 1 for faster testing
      numberOfRuns: 1,

      // Collect data from a local build
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 60000, // Increased timeout

      // URLs to test - just homepage for now
      url: [
        'http://localhost:4173/', // Homepage
      ],

      // Lighthouse settings
      settings: {
        // Use desktop mode for faster/more reliable tests locally
        preset: 'desktop',
        // Throttling configuration
        throttlingMethod: 'simulate',
        // Skip network-dependent audits for local testing
        skipAudits: ['redirects-http', 'uses-http2'],
        // Run key audits
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },

    assert: {
      // Assertion configuration
      preset: 'lighthouse:no-pwa',

      assertions: {
        // Core Web Vitals - CRITICAL metrics
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        'interactive': ['warn', { maxNumericValue: 3800 }],

        // Category scores - overall quality gates
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],

        // Resource optimization
        'uses-optimized-images': ['warn', { maxLength: 0 }],
        'uses-webp-images': ['warn', { maxLength: 0 }],
        'uses-responsive-images': ['warn', { maxLength: 0 }],
        'offscreen-images': 'off', // Turn off for e-commerce (lazy load)

        // Code optimization
        'unused-javascript': ['warn', { maxLength: 0 }],
        'unused-css-rules': ['warn', { maxLength: 0 }],
        'unminified-javascript': ['error', { maxLength: 0 }],
        'unminified-css': ['error', { maxLength: 0 }],

        // Modern practices
        'uses-http2': 'off', // Vercel handles this
        'uses-long-cache-ttl': 'warn',
        'uses-text-compression': ['error', { maxLength: 0 }],

        // Rendering performance
        'dom-size': ['warn', { maxNumericValue: 1500 }],
        'bootup-time': ['warn', { maxNumericValue: 3500 }],
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }],

        // Network optimization
        'total-byte-weight': ['warn', { maxNumericValue: 1000000 }], // 1MB
        'render-blocking-resources': 'warn',

        // JavaScript performance
        'legacy-javascript': 'warn',
        'duplicated-javascript': ['warn', { maxLength: 0 }],

        // Accessibility - important for e-commerce
        'color-contrast': ['warn', { minScore: 1 }],
        'image-alt': ['warn', { minScore: 1 }],
        'link-name': ['warn', { minScore: 1 }],
        'button-name': ['warn', { minScore: 1 }],
        'aria-allowed-attr': ['warn', { minScore: 1 }],

        // SEO - critical for product discovery
        'meta-description': ['warn', { minScore: 1 }],
        'document-title': ['error', { minScore: 1 }],
        'robots-txt': 'off',
      },
    },

    upload: {
      // Upload results to temporary public storage for PR comments
      target: 'temporary-public-storage',

      // Alternative: Use LHCI server (requires setup)
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.com',
      // token: process.env.LHCI_TOKEN,
    },
  },
};

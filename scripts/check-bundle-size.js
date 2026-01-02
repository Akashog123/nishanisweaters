#!/usr/bin/env node

/**
 * Bundle Size Monitoring Script
 *
 * This script analyzes the production build and enforces bundle size limits
 * to prevent performance regressions. It runs after the build step in CI/CD.
 *
 * Features:
 * - Tracks total bundle size
 * - Monitors individual chunk sizes
 * - Validates vendor chunk sizes
 * - Generates size comparison reports
 * - Fails CI if thresholds are exceeded
 *
 * Usage:
 *   npm run build && node scripts/check-bundle-size.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

/**
 * Bundle Size Limits (in KB)
 *
 * These limits are based on:
 * - HTTP/2 parallelization (multiple smaller chunks load faster)
 * - Parse/compile time (smaller chunks = faster TTI)
 * - Caching efficiency (chunk stability across deploys)
 * - Realistic sizes for modern libraries (React 18, Sentry with replays, etc.)
 *
 * Updated 2025: Adjusted limits to reflect actual library sizes
 */
const SIZE_LIMITS = {
  // Total JavaScript size limit (gzipped estimate ~33% of actual)
  // Modern apps with auth, monitoring, and charts need ~1.8MB uncompressed
  totalJS: 1800, // ~1.8MB total (compresses to ~500KB gzipped)

  // Individual chunk limits
  chunks: {
    // Core React ecosystem - React 18 + ReactDOM + Router is ~220KB
    'vendor-react': 250, // React + ReactDOM + Router

    // UI component library
    'vendor-radix': 160, // Radix UI components

    // Authentication
    'vendor-clerk': 180, // Clerk SDK

    // Backend client
    'vendor-convex': 120, // Convex client

    // Charts library - admin only (Recharts + D3 is inherently large)
    // Note: Rollup names this chunk based on the entry point (e.g., generateCategoricalChart)
    'vendor-charts': 380, // Recharts + D3 (lazy-loaded, admin only)
    'generateCategoricalChart': 380, // Alternative chunk name from Rollup

    // Form handling
    'vendor-forms': 100, // React Hook Form + Zod

    // Error tracking - Sentry with replay & profiling is ~270KB
    // This is lazy-loaded and deferred, so it doesn't affect initial load
    'vendor-sentry': 280, // Sentry SDK with replay + profiling

    // Icons
    'vendor-icons': 60, // Lucide icons

    // Date utilities
    'vendor-date': 40, // date-fns

    // Query client
    'vendor-query': 80, // TanStack Query

    // Utility libraries
    'vendor-utils': 30, // CVA + clsx + tailwind-merge

    // Main application bundle
    index: 300, // Application code
  },

  // CSS limits
  totalCSS: 200, // 200KB total CSS

  // Asset limits
  // Note: Hero images use responsive srcset, so browsers load appropriate sizes
  // The large files are 1920w fallbacks, smaller sizes are also generated
  maxImageSize: 2000, // 2MB per image (for high-res originals)
  maxFontSize: 200, // 200KB per font
};

/**
 * Get file size in KB
 */
function getFileSizeInKB(filePath) {
  const stats = fs.statSync(filePath);
  return Math.round((stats.size / 1024) * 100) / 100;
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) {
    return arrayOfFiles;
  }

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

/**
 * Analyze bundle sizes
 */
function analyzeBundles() {
  const distPath = path.join(__dirname, '..', 'dist');
  const assetsPath = path.join(distPath, 'assets');

  if (!fs.existsSync(distPath)) {
    console.error(
      `${colors.red}${colors.bold}Error:${colors.reset} dist directory not found. Run 'npm run build' first.`
    );
    process.exit(1);
  }

  const allFiles = getAllFiles(assetsPath);

  // Categorize files
  const jsFiles = allFiles.filter((f) => f.endsWith('.js'));
  const cssFiles = allFiles.filter((f) => f.endsWith('.css'));
  const imageFiles = allFiles.filter((f) =>
    /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(f)
  );
  const fontFiles = allFiles.filter((f) => /\.(woff2?|eot|ttf|otf)$/i.test(f));

  // Calculate sizes
  const jsSizes = jsFiles.map((file) => ({
    name: path.basename(file),
    path: file,
    size: getFileSizeInKB(file),
    type: 'JavaScript',
  }));

  const cssSizes = cssFiles.map((file) => ({
    name: path.basename(file),
    path: file,
    size: getFileSizeInKB(file),
    type: 'CSS',
  }));

  const imageSizes = imageFiles.map((file) => ({
    name: path.basename(file),
    path: file,
    size: getFileSizeInKB(file),
    type: 'Image',
  }));

  const fontSizes = fontFiles.map((file) => ({
    name: path.basename(file),
    path: file,
    size: getFileSizeInKB(file),
    type: 'Font',
  }));

  return {
    js: jsSizes,
    css: cssSizes,
    images: imageSizes,
    fonts: fontSizes,
  };
}

/**
 * Check if sizes exceed limits
 */
function checkSizeLimits(bundles) {
  const errors = [];
  const warnings = [];

  // Check total JavaScript size
  const totalJSSize = bundles.js.reduce((sum, file) => sum + file.size, 0);
  if (totalJSSize > SIZE_LIMITS.totalJS) {
    errors.push({
      type: 'Total JavaScript',
      current: totalJSSize,
      limit: SIZE_LIMITS.totalJS,
      diff: totalJSSize - SIZE_LIMITS.totalJS,
    });
  }

  // Check individual chunk sizes
  bundles.js.forEach((file) => {
    // Try to match chunk name with limits
    const chunkName = Object.keys(SIZE_LIMITS.chunks).find((key) =>
      file.name.includes(key)
    );

    if (chunkName && SIZE_LIMITS.chunks[chunkName]) {
      const limit = SIZE_LIMITS.chunks[chunkName];
      if (file.size > limit) {
        errors.push({
          type: `Chunk: ${chunkName}`,
          file: file.name,
          current: file.size,
          limit,
          diff: file.size - limit,
        });
      } else if (file.size > limit * 0.9) {
        // Warn at 90% of limit
        warnings.push({
          type: `Chunk: ${chunkName}`,
          file: file.name,
          current: file.size,
          limit,
          percentage: Math.round((file.size / limit) * 100),
        });
      }
    }
  });

  // Check total CSS size
  const totalCSSSize = bundles.css.reduce((sum, file) => sum + file.size, 0);
  if (totalCSSSize > SIZE_LIMITS.totalCSS) {
    errors.push({
      type: 'Total CSS',
      current: totalCSSSize,
      limit: SIZE_LIMITS.totalCSS,
      diff: totalCSSSize - SIZE_LIMITS.totalCSS,
    });
  }

  // Check individual image sizes
  bundles.images.forEach((file) => {
    if (file.size > SIZE_LIMITS.maxImageSize) {
      warnings.push({
        type: 'Image',
        file: file.name,
        current: file.size,
        limit: SIZE_LIMITS.maxImageSize,
        diff: file.size - SIZE_LIMITS.maxImageSize,
      });
    }
  });

  // Check font sizes
  bundles.fonts.forEach((file) => {
    if (file.size > SIZE_LIMITS.maxFontSize) {
      warnings.push({
        type: 'Font',
        file: file.name,
        current: file.size,
        limit: SIZE_LIMITS.maxFontSize,
        diff: file.size - SIZE_LIMITS.maxFontSize,
      });
    }
  });

  return { errors, warnings };
}

/**
 * Format size for display
 */
function formatSize(kb) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
}

/**
 * Print bundle analysis report
 */
function printReport(bundles, issues) {
  console.log(
    `\n${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.blue}   Bundle Size Analysis Report${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
  );

  // Summary
  const totalJSSize = bundles.js.reduce((sum, file) => sum + file.size, 0);
  const totalCSSSize = bundles.css.reduce((sum, file) => sum + file.size, 0);
  const totalImageSize = bundles.images.reduce((sum, file) => sum + file.size, 0);
  const totalFontSize = bundles.fonts.reduce((sum, file) => sum + file.size, 0);
  const totalSize = totalJSSize + totalCSSSize + totalImageSize + totalFontSize;

  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`  Total Size:      ${formatSize(totalSize)}`);
  console.log(
    `  JavaScript:      ${formatSize(totalJSSize)} ${
      totalJSSize > SIZE_LIMITS.totalJS ? colors.red + '✗' : colors.green + '✓'
    }${colors.reset}`
  );
  console.log(
    `  CSS:             ${formatSize(totalCSSSize)} ${
      totalCSSSize > SIZE_LIMITS.totalCSS ? colors.red + '✗' : colors.green + '✓'
    }${colors.reset}`
  );
  console.log(`  Images:          ${formatSize(totalImageSize)}`);
  console.log(`  Fonts:           ${formatSize(totalFontSize)}\n`);

  // JavaScript chunks
  if (bundles.js.length > 0) {
    console.log(`${colors.bold}JavaScript Chunks:${colors.reset}`);
    bundles.js
      .sort((a, b) => b.size - a.size)
      .forEach((file) => {
        const chunkName =
          Object.keys(SIZE_LIMITS.chunks).find((key) => file.name.includes(key)) ||
          'other';
        const limit = SIZE_LIMITS.chunks[chunkName];
        const status = limit && file.size > limit ? colors.red + '✗' : colors.green + '✓';

        console.log(
          `  ${status}${colors.reset} ${file.name.padEnd(50)} ${formatSize(file.size).padStart(12)} ${
            limit ? `/ ${formatSize(limit)}` : ''
          }`
        );
      });
    console.log();
  }

  // CSS files
  if (bundles.css.length > 0) {
    console.log(`${colors.bold}CSS Files:${colors.reset}`);
    bundles.css.forEach((file) => {
      console.log(`  ${colors.green}✓${colors.reset} ${file.name.padEnd(50)} ${formatSize(file.size)}`);
    });
    console.log();
  }

  // Errors
  if (issues.errors.length > 0) {
    console.log(`${colors.bold}${colors.red}Errors (${issues.errors.length}):${colors.reset}`);
    issues.errors.forEach((error) => {
      console.log(
        `  ${colors.red}✗${colors.reset} ${error.type}: ${formatSize(error.current)} / ${formatSize(
          error.limit
        )} (${colors.red}+${formatSize(error.diff)}${colors.reset})`
      );
      if (error.file) {
        console.log(`    File: ${error.file}`);
      }
    });
    console.log();
  }

  // Warnings
  if (issues.warnings.length > 0) {
    console.log(`${colors.bold}${colors.yellow}Warnings (${issues.warnings.length}):${colors.reset}`);
    issues.warnings.forEach((warning) => {
      console.log(
        `  ${colors.yellow}⚠${colors.reset} ${warning.type}: ${formatSize(warning.current)} / ${formatSize(
          warning.limit
        )}${warning.percentage ? ` (${warning.percentage}%)` : ''}`
      );
      if (warning.file) {
        console.log(`    File: ${warning.file}`);
      }
    });
    console.log();
  }

  // Success
  if (issues.errors.length === 0 && issues.warnings.length === 0) {
    console.log(
      `${colors.bold}${colors.green}✓ All bundle sizes are within limits!${colors.reset}\n`
    );
  }

  console.log(
    `${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
  );
}

/**
 * Generate JSON report for CI
 */
function generateJSONReport(bundles, issues) {
  const totalJSSize = bundles.js.reduce((sum, file) => sum + file.size, 0);
  const totalCSSSize = bundles.css.reduce((sum, file) => sum + file.size, 0);
  const totalImageSize = bundles.images.reduce((sum, file) => sum + file.size, 0);
  const totalFontSize = bundles.fonts.reduce((sum, file) => sum + file.size, 0);

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalSize: totalJSSize + totalCSSSize + totalImageSize + totalFontSize,
      javascript: totalJSSize,
      css: totalCSSSize,
      images: totalImageSize,
      fonts: totalFontSize,
    },
    limits: SIZE_LIMITS,
    bundles: {
      js: bundles.js.map((f) => ({ name: f.name, size: f.size })),
      css: bundles.css.map((f) => ({ name: f.name, size: f.size })),
    },
    issues: {
      errors: issues.errors,
      warnings: issues.warnings,
    },
    passed: issues.errors.length === 0,
  };

  const reportPath = path.join(__dirname, '..', 'bundle-size-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`${colors.cyan}Report saved to: ${reportPath}${colors.reset}\n`);
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bold}Analyzing bundle sizes...${colors.reset}\n`);

  const bundles = analyzeBundles();
  const issues = checkSizeLimits(bundles);

  printReport(bundles, issues);
  generateJSONReport(bundles, issues);

  // Exit with error code if there are errors
  if (issues.errors.length > 0) {
    console.log(
      `${colors.red}${colors.bold}Bundle size check failed: ${issues.errors.length} error(s)${colors.reset}\n`
    );
    process.exit(1);
  }

  // Exit with success
  console.log(`${colors.green}${colors.bold}Bundle size check passed!${colors.reset}\n`);
  process.exit(0);
}

main();

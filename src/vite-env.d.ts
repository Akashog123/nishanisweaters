/// <reference types="vite/client" />

// vite-imagetools module declarations for image imports with query parameters
// These declarations handle dynamic image imports with width and format transformations
// Pattern: image.jpg?w=480&format=avif

// AVIF format declarations
declare module "*&format=avif" {
  const src: string;
  export default src;
}

// WebP format declarations
declare module "*&format=webp" {
  const src: string;
  export default src;
}

// AVIF static file imports
declare module "*.avif" {
  const src: string;
  export default src;
}

/// <reference types="vite/client" />

// vite-imagetools module declarations for image imports with query parameters
declare module "*?w=*&format=avif" {
  const src: string;
  export default src;
}

declare module "*?w=*&format=webp" {
  const src: string;
  export default src;
}

declare module "*.avif" {
  const src: string;
  export default src;
}

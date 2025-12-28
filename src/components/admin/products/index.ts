// Types
export type { Product, ProductFormData, ProductVariant, ProductImage, ProductVideo, CategoryFilterType, StockFilterType } from "./types";
export { initialFormData } from "./types";

// Utils
export { generateSlug, filterProducts, paginateProducts, calculateProductStats, getTotalStock, hasLowStock, isOutOfStock, isInStock } from "./utils";

// Components
export { StockStatus } from "./StockStatus";
export { ProductStatsCards } from "./ProductStatsCards";
export { ProductFilters } from "./ProductFilters";
export { ProductFormDialog } from "./ProductFormDialog";
export { ProductTableRow } from "./ProductTableRow";
export { ProductsTable } from "./ProductsTable";

// Hooks
export { useProductFilters } from "./useProductFilters";
export { useProductMutations } from "./useProductMutations";

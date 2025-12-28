import { Product, ProductVariant, StockFilterType } from "./types";

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getTotalStock(variants: ProductVariant[]): number {
  return variants.reduce((sum, v) => sum + v.stockQuantity, 0);
}

export function hasLowStock(variants: ProductVariant[]): boolean {
  return variants.some((v) => v.stockQuantity <= v.lowStockThreshold && v.stockQuantity > 0);
}

export function isOutOfStock(variants: ProductVariant[]): boolean {
  return variants.every((v) => v.stockQuantity === 0);
}

export function isInStock(variants: ProductVariant[]): boolean {
  return variants.some((v) => v.stockQuantity > v.lowStockThreshold);
}

export function filterProducts(
  products: Product[],
  searchQuery: string,
  categoryFilter: string,
  stockFilter: StockFilterType
): Product[] {
  return products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;

    let matchesStock = true;
    if (stockFilter === "low") {
      matchesStock = hasLowStock(product.variants);
    } else if (stockFilter === "out") {
      matchesStock = isOutOfStock(product.variants);
    } else if (stockFilter === "in") {
      matchesStock = isInStock(product.variants);
    }

    return matchesSearch && matchesCategory && matchesStock;
  });
}

export function paginateProducts<T>(
  products: T[],
  currentPage: number,
  itemsPerPage: number
): T[] {
  return products.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
}

export function calculateProductStats(products: Product[]) {
  return {
    total: products.length,
    inStock: products.filter((p) => isInStock(p.variants)).length,
    outOfStock: products.filter((p) => isOutOfStock(p.variants)).length,
  };
}

import { Id } from "../../../../convex/_generated/dataModel";
import { ProductVariant, ProductImage, ProductVideo } from "@/types";

// Re-export central types for convenience
export type { ProductVariant, ProductImage, ProductVideo };

export interface Product {
  _id: Id<"products">;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string; // Optional to match Convex return type
  category: string;
  retailPrice: number;
  compareAtPrice?: number; // Regular Price / MSRP - shown as strikethrough
  wholesalePrice?: number;
  minOrderQuantity?: number;
  images: ProductImage[];
  videos?: ProductVideo[];
  variants: ProductVariant[];
  tags: string[];
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  isActive: boolean;
}

export interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  retailPrice: number;
  compareAtPrice: number; // Regular Price / MSRP
  wholesalePrice: number;
  minOrderQuantity: number;
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  variants: ProductVariant[]; // Stock is managed at variant level
}

export const initialFormData: ProductFormData = {
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  category: "",
  retailPrice: 0,
  compareAtPrice: 0,
  wholesalePrice: 0,
  minOrderQuantity: 1,
  featured: false,
  bestseller: false,
  newArrival: true,
  variants: [
    {
      sku: "",
      size: "M",
      color: "Black",
      stockQuantity: 10,
      lowStockThreshold: 5,
    },
  ],
};

export type StockFilterType = "all" | "in_stock" | "low_stock" | "out_of_stock";
export type CategoryFilterType = string;

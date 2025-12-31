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
  wholesalePrice: number;
  minOrderQuantity: number;
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
}

export const initialFormData: ProductFormData = {
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  category: "mens",
  retailPrice: 0,
  wholesalePrice: 0,
  minOrderQuantity: 1,
  featured: false,
  bestseller: false,
  newArrival: true,
};

export type StockFilterType = "all" | "in_stock" | "low_stock" | "out_of_stock";
export type CategoryFilterType = "all" | "mens" | "womens" | "kids" | "winter" | "accessories";

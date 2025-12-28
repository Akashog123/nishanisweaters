import { Id } from "../../../../convex/_generated/dataModel";

export interface ProductVariant {
  sku: string;
  size: string;
  color: string;
  stockQuantity: number;
  lowStockThreshold: number;
}

export interface ProductImage {
  url: string;
  storageId?: string;
  alt: string;
  order: number;
}

export interface ProductVideo {
  youtubeId: string;
  title?: string;
  thumbnail: string;
  order: number;
}

export interface Product {
  _id: Id<"products">;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  retailPrice: number;
  wholesalePriceTier1: number;
  wholesalePriceTier2: number;
  wholesalePriceTier3: number;
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
  wholesalePriceTier1: number;
  wholesalePriceTier2: number;
  wholesalePriceTier3: number;
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
  wholesalePriceTier1: 0,
  wholesalePriceTier2: 0,
  wholesalePriceTier3: 0,
  featured: false,
  bestseller: false,
  newArrival: true,
};

export type StockFilterType = "all" | "in" | "low" | "out";
export type CategoryFilterType = "all" | "mens" | "womens" | "winter" | "accessories";

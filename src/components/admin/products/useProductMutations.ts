import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { ProductFormData } from "./types";

export function useProductMutations() {
  const [editingProduct, setEditingProduct] = useState<
    (ProductFormData & { _id?: Id<"products"> }) | null
  >(null);

  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const deleteProduct = useMutation(api.products.deleteProduct);

  const handleProductSubmit = useCallback(
    async (data: ProductFormData, id?: Id<"products">) => {
      try {
        if (id) {
          await updateProduct({
            productId: id,
            name: data.name,
            slug: data.slug,
            description: data.description,
            shortDescription: data.shortDescription,
            category: data.category,
            retailPrice: data.retailPrice,
            wholesalePriceTier1: data.wholesalePriceTier1,
            wholesalePriceTier2: data.wholesalePriceTier2,
            wholesalePriceTier3: data.wholesalePriceTier3,
            featured: data.featured,
            bestseller: data.bestseller,
            newArrival: data.newArrival,
          });
          toast.success("Product updated successfully");
        } else {
          await createProduct({
            name: data.name,
            slug: data.slug,
            description: data.description,
            shortDescription: data.shortDescription,
            category: data.category,
            retailPrice: data.retailPrice,
            wholesalePriceTier1: data.wholesalePriceTier1,
            wholesalePriceTier2: data.wholesalePriceTier2,
            wholesalePriceTier3: data.wholesalePriceTier3,
            images: [{ url: "/placeholder.svg", alt: data.name, order: 0 }],
            variants: [
              {
                sku: `${data.slug}-M-BLK`,
                size: "M",
                color: "Black",
                stockQuantity: 10,
                lowStockThreshold: 5,
              },
            ],
            tags: [data.category],
            featured: data.featured,
            bestseller: data.bestseller,
            newArrival: data.newArrival,
          });
          toast.success("Product created successfully");
        }
        setEditingProduct(null);
      } catch (error) {
        toast.error("Failed to save product");
        throw error;
      }
    },
    [createProduct, updateProduct]
  );

  const handleDeleteProduct = useCallback(
    async (productId: Id<"products">) => {
      try {
        await deleteProduct({ productId });
        toast.success("Product deleted successfully");
      } catch (error) {
        toast.error("Failed to delete product");
      }
    },
    [deleteProduct]
  );

  return {
    editingProduct,
    setEditingProduct,
    handleProductSubmit,
    handleDeleteProduct,
  };
}

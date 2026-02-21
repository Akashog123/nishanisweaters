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
    async (data: ProductFormData, id?: Id<"products">): Promise<Id<"products"> | undefined> => {
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
            wholesalePrice: data.wholesalePrice || undefined,
            featured: data.featured,
            bestseller: data.bestseller,
            newArrival: data.newArrival,
            variants: data.variants,
          });
          toast.success("Product updated successfully");
          return id;
        } else {
          // Generate default variants if none provided
          const variants = data.variants.length > 0
            ? data.variants
            : [
                {
                  sku: `${data.slug}-M-BLK`,
                  size: "M",
                  color: "Black",
                  stockQuantity: 10,
                  lowStockThreshold: 5,
                },
              ];

          const newProductId = await createProduct({
            name: data.name,
            slug: data.slug,
            description: data.description,
            shortDescription: data.shortDescription,
            category: data.category,
            retailPrice: data.retailPrice,
            wholesalePrice: data.wholesalePrice || undefined,
            images: [{ url: "/placeholder.svg", alt: data.name, order: 0 }],
            variants,
            tags: [data.category],
            featured: data.featured,
            bestseller: data.bestseller,
            newArrival: data.newArrival,
            minOrderQuantity: data.minOrderQuantity || undefined,
          });
          toast.success("Product created successfully");
          return newProductId;
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
      } catch (_error) {
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

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Id } from "../../../../convex/_generated/dataModel";
import { ProductFormData, initialFormData, ProductImage, ProductVideo } from "./types";
import { generateSlug } from "./utils";
import { ProductMediaUpload } from "../ProductMediaUpload";
import { VariantEditor } from "./VariantEditor";
import { useActiveCategories } from "../../../hooks/useCategories";

interface ProductFormDialogProps {
  product?: ProductFormData & {
    _id?: Id<"products">;
    images?: ProductImage[];
    videos?: ProductVideo[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductFormData, id?: Id<"products">) => Promise<Id<"products"> | undefined>;
}

export function ProductFormDialog({
  product,
  open,
  onOpenChange,
  onSubmit,
}: ProductFormDialogProps) {
  const categoriesQuery = useActiveCategories();
  const categories = categoriesQuery || [];

  const [formData, setFormData] = useState<ProductFormData>(
    product || initialFormData
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [createdProductId, setCreatedProductId] = useState<Id<"products"> | null>(null);

  const isEditing = !!product?._id || !!createdProductId;

  // Determine which product ID to use for media queries
  const effectiveProductId = createdProductId || product?._id;

  // Fetch the product after creation to get fresh data (including images)
  const createdProduct = useQuery(
    api.products.getProductById,
    effectiveProductId ? { productId: effectiveProductId } : "skip"
  );

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData(initialFormData);
    }
    setActiveTab("details");
    setCreatedProductId(null);
  }, [product, open]);

  // Category name resolution is handled by the Select component directly

  // Handle product creation + media upload flow
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const existingId = product?._id || createdProductId || undefined;
      const newProductId = await onSubmit(formData, existingId);

      if (!existingId && newProductId) {
        // New product created - switch to media tab
        setCreatedProductId(newProductId);
        setActiveTab("media");
      } else {
        onOpenChange(false);
        setFormData(initialFormData);
        setCreatedProductId(null);
      }
    } catch {
      // Error is handled by parent
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, formData, product?._id, createdProductId, onOpenChange]);

  // Handler for switching back to details after adding media
  const handleBackToDetails = useCallback(() => {
    setActiveTab("details");
    setCreatedProductId(null);
    onOpenChange(false);
    setFormData(initialFormData);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "Edit Product" : "Add New Product"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "Update the product details below"
              : "Fill in the product details to add a new product"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Product Details</TabsTrigger>
            <TabsTrigger value="stock">Stock & Variants</TabsTrigger>
            <TabsTrigger value="media">Images & Videos</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <ProductDetailsForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onCancel={createdProductId ? handleBackToDetails : () => onOpenChange(false)}
              isSubmitting={isSubmitting}
              isEditing={isEditing}
              showDoneButton={!!createdProductId}
              categories={categories}
            />
          </TabsContent>

          <TabsContent value="stock" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage product variants (size/color combinations) and their stock levels.
              </p>
              <VariantEditor
                variants={formData.variants}
                onVariantsChange={(variants) => setFormData({ ...formData, variants })}
                slug={formData.slug}
              />
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={createdProductId ? handleBackToDetails : () => onOpenChange(false)}
                >
                  {createdProductId ? "Done" : "Cancel"}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : isEditing ? "Update Product" : "Add Product"}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>

          <TabsContent value="media" className="mt-4">
            {effectiveProductId ? (
              <ProductMediaUpload
                productId={effectiveProductId}
                images={createdProduct ? createdProduct.images : product?.images || []}
                videos={createdProduct ? createdProduct.videos : product?.videos || []}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Please save the product first to add images and videos.</p>
                <p className="text-xs mt-1">Click "Add Product" in the Product Details tab to create the product first.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Extracted form component for reuse
function ProductDetailsForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isSubmitting,
  isEditing,
  showDoneButton = false,
  categories,
}: {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isEditing: boolean;
  showDoneButton?: boolean;
  categories: any[]; // Using any[] here as a quick fix, better to import the type if available
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => {
              setFormData({
                ...formData,
                name: e.target.value,
                slug: generateSlug(e.target.value),
              });
            }}
            placeholder="Winter Wool Sweater"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) =>
              setFormData({ ...formData, slug: e.target.value })
            }
            placeholder="winter-wool-sweater"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shortDescription">Short Description</Label>
        <Input
          id="shortDescription"
          value={formData.shortDescription}
          onChange={(e) =>
            setFormData({ ...formData, shortDescription: e.target.value })
          }
          placeholder="A cozy winter sweater made from premium wool"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Full Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Detailed product description..."
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) =>
              setFormData({ ...formData, category: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <SelectItem key={cat._id} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground text-center">Loading categories...</div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="retailPrice">Retail Price (INR)</Label>
          <Input
            id="retailPrice"
            type="number"
            value={formData.retailPrice}
            onChange={(e) =>
              setFormData({
                ...formData,
                retailPrice: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="2499"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="compareAtPrice">Regular Price / MSRP (INR)</Label>
          <Input
            id="compareAtPrice"
            type="number"
            value={formData.compareAtPrice || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                compareAtPrice: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="2999 (optional)"
          />
          <p className="text-xs text-muted-foreground">
            Original price before discount (shown as strikethrough)
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wholesalePrice">Wholesale Price (INR)</Label>
          <Input
            id="wholesalePrice"
            type="number"
            value={formData.wholesalePrice}
            onChange={(e) =>
              setFormData({
                ...formData,
                wholesalePrice: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="1799"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minOrderQuantity">Min. Order Qty (Wholesale)</Label>
          <Input
            id="minOrderQuantity"
            type="number"
            value={formData.minOrderQuantity}
            onChange={(e) =>
              setFormData({
                ...formData,
                minOrderQuantity: parseInt(e.target.value) || 1,
              })
            }
            placeholder="10"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) =>
              setFormData({ ...formData, featured: e.target.checked })
            }
            className="rounded border-gray-300"
          />
          <span className="text-sm">Featured</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.bestseller}
            onChange={(e) =>
              setFormData({ ...formData, bestseller: e.target.checked })
            }
            className="rounded border-gray-300"
          />
          <span className="text-sm">Bestseller</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.newArrival}
            onChange={(e) =>
              setFormData({ ...formData, newArrival: e.target.checked })
            }
            className="rounded border-gray-300"
          />
          <span className="text-sm">New Arrival</span>
        </label>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          {showDoneButton ? "Done" : "Cancel"}
        </Button>
        {!showDoneButton && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Update Product" : "Add Product"}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

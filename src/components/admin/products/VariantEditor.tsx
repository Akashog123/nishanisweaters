"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";
import { ProductVariant } from "./types";

interface VariantEditorProps {
  variants: ProductVariant[];
  onVariantsChange: (variants: ProductVariant[]) => void;
  slug: string; // Used for auto-generating SKU
}

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];

export function VariantEditor({ variants, onVariantsChange, slug }: VariantEditorProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newVariant, setNewVariant] = useState<Partial<ProductVariant>>({
    size: "M",
    color: "Black",
    colorHex: "#000000",
    stockQuantity: 10,
    lowStockThreshold: 5,
    sku: "",
  });

  // Generate SKU based on slug and variant attributes
  const generateSku = (variant: Partial<ProductVariant>) => {
    if (variant.sku) return variant.sku;
    const size = variant.size || "M";
    const color = variant.color || "Black";
    const colorCode = color.substring(0, 3).toUpperCase();
    return `${slug}-${size}-${colorCode}`;
  };

  const handleAddVariant = () => {
    const variant: ProductVariant = {
      sku: newVariant.sku || generateSku(newVariant),
      size: newVariant.size || "M",
      color: newVariant.color || "Black",
      colorHex: newVariant.colorHex,
      stockQuantity: newVariant.stockQuantity || 0,
      lowStockThreshold: newVariant.lowStockThreshold || 5,
    };

    onVariantsChange([...variants, variant]);
    setIsAddDialogOpen(false);
    setNewVariant({
      size: "M",
      color: "Black",
      colorHex: "#000000",
      stockQuantity: 10,
      lowStockThreshold: 5,
      sku: "",
    });
  };

  const handleDeleteVariant = (sku: string) => {
    if (variants.length <= 1) {
      alert("Cannot delete the last variant. At least one variant is required.");
      return;
    }
    onVariantsChange(variants.filter((v) => v.sku !== sku));
  };

  const handleUpdateVariant = (sku: string, field: keyof ProductVariant, value: string | number) => {
    onVariantsChange(
      variants.map((v) =>
        v.sku === sku ? { ...v, [field]: value } : v
      )
    );
  };

  const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
  const hasLowStock = variants.some(
    (v) => v.stockQuantity > 0 && v.stockQuantity <= v.lowStockThreshold
  );
  const isOutOfStock = variants.every((v) => v.stockQuantity === 0);

  return (
    <div className="space-y-4">
      {/* Stock Summary */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <Label className="text-muted-foreground">Total Stock</Label>
          <p className="text-2xl font-bold">{totalStock}</p>
        </div>
        <div className="flex-1">
          <Label className="text-muted-foreground">Stock Status</Label>
          <p className={`text-lg font-semibold ${isOutOfStock ? "text-red-600" : hasLowStock ? "text-amber-600" : "text-green-600"}`}>
            {isOutOfStock ? "Out of Stock" : hasLowStock ? "Low Stock" : "In Stock"}
          </p>
        </div>
        <div className="flex-1">
          <Label className="text-muted-foreground">Total Variants</Label>
          <p className="text-2xl font-bold">{variants.length}</p>
        </div>
      </div>

      {/* Variants Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Size</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="w-32">Stock Qty</TableHead>
              <TableHead className="w-32">Low Stock Threshold</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant) => (
              <TableRow key={variant.sku}>
                <TableCell>
                  <select
                    value={variant.size}
                    onChange={(e) => handleUpdateVariant(variant.sku, "size", e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                  >
                    {COMMON_SIZES.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={variant.colorHex || "#000000"}
                      onChange={(e) => handleUpdateVariant(variant.sku, "colorHex", e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <Input
                      value={variant.color}
                      onChange={(e) => handleUpdateVariant(variant.sku, "color", e.target.value)}
                      className="w-24"
                      placeholder="Color"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    value={variant.sku}
                    onChange={(e) => handleUpdateVariant(variant.sku, "sku", e.target.value)}
                    className="w-40"
                    placeholder="SKU"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={variant.stockQuantity}
                    onChange={(e) => handleUpdateVariant(variant.sku, "stockQuantity", parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={variant.lowStockThreshold}
                    onChange={(e) => handleUpdateVariant(variant.sku, "lowStockThreshold", parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteVariant(variant.sku)}
                    disabled={variants.length <= 1}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Variant Button */}
      <Button variant="outline" onClick={() => setIsAddDialogOpen(true)} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Variant
      </Button>

      {/* Add Variant Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Variant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Size</Label>
                <select
                  value={newVariant.size}
                  onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {COMMON_SIZES.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newVariant.colorHex || "#000000"}
                    onChange={(e) => setNewVariant({ ...newVariant, colorHex: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={newVariant.color}
                    onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })}
                    placeholder="Color name"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={newVariant.stockQuantity}
                  onChange={(e) => setNewVariant({ ...newVariant, stockQuantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Low Stock Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  value={newVariant.lowStockThreshold}
                  onChange={(e) => setNewVariant({ ...newVariant, lowStockThreshold: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>SKU (optional)</Label>
              <Input
                value={newVariant.sku}
                onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                placeholder={`${generateSku(newVariant)}`}
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated: {generateSku(newVariant)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddVariant}>
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { Product } from "./types";
import { StockStatus } from "./StockStatus";
import { Id } from "../../../../convex/_generated/dataModel";

interface ProductTableRowProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: Id<"products">) => void;
}

export function ProductTableRow({ product, onEdit, onDelete }: ProductTableRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100">
          <img
            src={product.images[0]?.url || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{product.name}</div>
          <div className="text-sm text-muted-foreground">
            {product.slug}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="capitalize">
          {product.category}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="font-medium">
          {formatCurrency(product.retailPrice)}
        </div>
        <div className="text-xs text-muted-foreground">
          W: {formatCurrency(product.wholesalePriceTier1)}
        </div>
      </TableCell>
      <TableCell>
        <StockStatus variants={product.variants} />
      </TableCell>
      <TableCell>
        <div className="flex gap-1 flex-wrap">
          {product.featured && (
            <Badge variant="default" className="text-xs">
              Featured
            </Badge>
          )}
          {product.bestseller && (
            <Badge variant="secondary" className="text-xs">
              Bestseller
            </Badge>
          )}
          {product.newArrival && (
            <Badge variant="outline" className="text-xs">
              New
            </Badge>
          )}
          {!product.isActive && (
            <Badge variant="destructive" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(product)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{product.name}"?
                  This action will mark the product as inactive.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(product._id)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

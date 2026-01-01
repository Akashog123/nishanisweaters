import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import {
  Product,
  ProductStatsCards,
  ProductFilters,
  ProductFormDialog,
  ProductsTable,
  useProductFilters,
  useProductMutations,
} from "@/components/admin/products";

const ITEMS_PER_PAGE = 10;

const AdminProducts = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Custom hooks for filtering and mutations
  const {
    searchQuery,
    categoryFilter,
    stockFilter,
    currentPage,
    cursor,
    cursorHistory,
    setSearchQuery,
    setCategoryFilter,
    setStockFilter,
    goToNextPage,
    goToPreviousPage,
  } = useProductFilters();

  const {
    editingProduct,
    setEditingProduct,
    handleProductSubmit,
    handleDeleteProduct,
  } = useProductMutations();

  // Type-safe wrapper to convert Product to ProductFormData for editing
  const handleEdit = (product: Product) => {
    setEditingProduct({
      _id: product._id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription || "",
      category: product.category,
      retailPrice: product.retailPrice,
      compareAtPrice: product.compareAtPrice || 0,
      wholesalePrice: product.wholesalePrice || 0,
      minOrderQuantity: product.minOrderQuantity || 1,
      featured: product.featured,
      bestseller: product.bestseller,
      newArrival: product.newArrival,
    });
  };

  // Fetch products using server-side pagination
  const productsResult = useQuery(api.products.listProductsForAdmin, {
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    stockStatus: stockFilter !== "all" ? stockFilter : undefined,
    searchQuery: searchQuery || undefined,
    limit: ITEMS_PER_PAGE,
    cursor: cursor ?? undefined,
  });

  const products = (productsResult?.products || []) as Product[];
  const continueCursor = productsResult?.continueCursor;
  const isDone = productsResult?.isDone ?? true;

  // Fetch aggregated stats using dedicated efficient query
  const productStats = useQuery(api.products.getProductStats, {});

  // Calculate if we can navigate
  const canGoNext = !isDone && continueCursor;
  const canGoPrevious = cursorHistory.length > 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground">
              Manage your product catalog
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Stats Cards */}
        <ProductStatsCards
          stats={productStats ?? {
            totalCount: 0,
            activeCount: 0,
            inStockCount: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
          }}
        />

        {/* Filters */}
        <ProductFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          stockFilter={stockFilter}
          onStockChange={setStockFilter}
        />

        {/* Products Table with server-side pagination */}
        <ProductsTable
          products={products}
          totalCount={products.length}
          currentPage={currentPage}
          totalPages={isDone ? currentPage : currentPage + 1}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={(page) => {
            if (page > currentPage && canGoNext) {
              goToNextPage(continueCursor!);
            } else if (page < currentPage && canGoPrevious) {
              goToPreviousPage();
            }
          }}
          onEdit={handleEdit}
          onDelete={handleDeleteProduct}
          canGoNext={!!canGoNext}
          canGoPrevious={canGoPrevious}
          onNextPage={() => canGoNext && goToNextPage(continueCursor!)}
          onPreviousPage={() => canGoPrevious && goToPreviousPage()}
        />

        {/* Add Product Dialog */}
        <ProductFormDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={handleProductSubmit}
        />

        {/* Edit Product Dialog */}
        {editingProduct && (
          <ProductFormDialog
            product={editingProduct}
            open={!!editingProduct}
            onOpenChange={(open) => {
              if (!open) setEditingProduct(null);
            }}
            onSubmit={handleProductSubmit}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;

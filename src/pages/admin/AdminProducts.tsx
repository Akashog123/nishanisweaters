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
  filterProducts,
  paginateProducts,
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
    setSearchQuery,
    setCategoryFilter,
    setStockFilter,
    setCurrentPage,
  } = useProductFilters();

  const {
    editingProduct,
    setEditingProduct,
    handleProductSubmit,
    handleDeleteProduct,
  } = useProductMutations();

  // Fetch products
  const allProducts = useQuery(api.products.listProducts, {}) as Product[] | undefined;
  const lowStockProducts = useQuery(api.products.getLowStockProducts);

  // Filter and paginate products
  const filteredProducts = filterProducts(
    allProducts || [],
    searchQuery,
    categoryFilter,
    stockFilter
  );

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = paginateProducts(
    filteredProducts,
    currentPage,
    ITEMS_PER_PAGE
  );

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
          products={allProducts || []}
          lowStockCount={lowStockProducts?.length || 0}
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

        {/* Products Table */}
        <ProductsTable
          products={paginatedProducts}
          totalCount={filteredProducts.length}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          onEdit={setEditingProduct}
          onDelete={handleDeleteProduct}
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

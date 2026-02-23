import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { MAX_FILE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  FolderTree,
  Loader2,
  Package,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  X,
} from "lucide-react";

interface Category {
  _id: Id<"categories">;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  imageStorageId?: string;
  isActive: boolean;
  showInHeader: boolean;
  displayOrder: number;
  productCount?: number;
  activeProductCount?: number;
  createdAt: number;
  updatedAt: number;
}

// Category Form Component
function CategoryForm({
  category,
  isOpen,
  onClose,
  onSave,
  isLoading,
  existingCategories,
}: {
  category?: Category | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    imageStorageId?: string;
    showInHeader: boolean;
    displayOrder: number;
  }) => Promise<void>;
  isLoading: boolean;
  existingCategories: Category[];
}) {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    imageUrl: "",
    imageStorageId: "",
    showInHeader: false,
    displayOrder: 1,
  });

  const [autoSlug, setAutoSlug] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.fileStorage.generateAdminUploadUrl);

  // Sync state when category prop changes (important for editing!)
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        slug: category.slug || "",
        description: category.description || "",
        imageUrl: category.imageUrl || "",
        imageStorageId: category.imageStorageId || "",
        showInHeader: category.showInHeader ?? false,
        displayOrder: category.displayOrder || 1,
      });
      setAutoSlug(false);
    } else {
      // Auto-assign the next display order
      const nextOrder = existingCategories.length > 0
        ? Math.max(...existingCategories.map(c => c.displayOrder)) + 1
        : 1;

      setFormData({
        name: "",
        slug: "",
        description: "",
        imageUrl: "",
        imageStorageId: "",
        showInHeader: false,
        displayOrder: nextOrder,
      });
      setAutoSlug(true);
    }
  }, [category, existingCategories.length, isOpen]);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: autoSlug ? generateSlug(name) : prev.slug,
    }));
  };

  const handleSlugChange = (slug: string) => {
    setAutoSlug(false);
    setFormData((prev) => ({ ...prev, slug }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File size exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const uploadUrl = await generateUploadUrl();
      setUploadProgress(30);

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.statusText}`);
      }

      setUploadProgress(70);
      const { storageId } = await response.json();

      // We don't save to the category yet, just hold the storage ID in form state
      // We'll only save it when the form is submitted

      // Get a temporary URL to preview the image
      // In a real app we might want to use a local blob URL for preview before save
      // but Convex storage gives us an easy way to get a URL if we just create the category later
      const blobUrl = URL.createObjectURL(file);

      setFormData(prev => ({
        ...prev,
        imageUrl: blobUrl, // Temporary preview URL
        imageStorageId: storageId, // Actual storage ID for backend
      }));

      toast.success("Image uploaded successfully");
      setUploadProgress(100);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      imageUrl: "",
      imageStorageId: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    if (!formData.slug.trim()) {
      toast.error("Please enter a slug");
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.slug)) {
      toast.error("Slug must contain only lowercase letters, numbers, and hyphens");
      return;
    }

    // Validate display order uniqueness when creating a new category or changing order
    if (!category || formData.displayOrder !== category.displayOrder) {
      const orderExists = existingCategories.some(
        c => c.displayOrder === formData.displayOrder && c._id !== category?._id
      );

      if (orderExists) {
        toast.error(`Display order ${formData.displayOrder} is already in use by another category. Please choose a different number.`);
        return;
      }
    }

    await onSave({
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      description: formData.description.trim() || undefined,
      imageUrl: formData.imageUrl || undefined,
      imageStorageId: formData.imageStorageId || undefined,
      showInHeader: formData.showInHeader,
      displayOrder: formData.displayOrder,
    });
  };

  // Reset form when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            {category ? "Edit Category" : "Create Category"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Update the category details below."
              : "Add a new product category to your store."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Men's Wear"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="e.g., mens-wear"
            />
            <p className="text-xs text-muted-foreground">
              Used in URLs: /shop/{formData.slug || "slug"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Category Image</Label>
            <div className="flex flex-col gap-4">
              {formData.imageUrl ? (
                <div className="relative aspect-video w-full max-w-[300px] overflow-hidden rounded-md border">
                  <img
                    src={formData.imageUrl}
                    alt="Category preview"
                    className="h-full w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 h-8 w-8"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`flex aspect-video w-full max-w-[300px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed transition-colors ${
                    isUploading ? "border-muted bg-muted/50" : "hover:border-primary/50 hover:bg-muted/50"
                  }`}
                  onClick={() => !isUploading && imageInputRef.current?.click()}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2 px-4 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <Progress value={uploadProgress} className="h-2 w-32" />
                      <span className="text-xs text-muted-foreground">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm font-medium">Click to upload image</span>
                      <span className="text-xs">Used on homepage categories</span>
                    </div>
                  )}
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Optional description for this category"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Show in Header Navigation</Label>
              <p className="text-xs text-muted-foreground">
                Display this category in the main navigation menu
              </p>
            </div>
            <Switch
              checked={formData.showInHeader}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, showInHeader: checked }))
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : category ? (
                "Update Category"
              ) : (
                "Create Category"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Loading Skeleton
function CategoriesTableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Component
export default function AdminCategories() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Queries
  const categoriesData = useQuery(api.categories.getCategoryStats);

  // Mutations
  const createCategory = useMutation(api.categories.createCategory);
  const updateCategory = useMutation(api.categories.updateCategory);
  const deleteCategory = useMutation(api.categories.deleteCategory);
  const reorderCategories = useMutation(api.categories.reorderCategories);

  const categories = categoriesData || [];

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Create a new array with the reordered categories
    const reorderedCategories = Array.from(categories);
    const [movedCategory] = reorderedCategories.splice(sourceIndex, 1);
    reorderedCategories.splice(destinationIndex, 0, movedCategory);

    // Get the new ordered array of IDs
    const orderedIds = reorderedCategories.map((c) => c._id);

    try {
      await reorderCategories({ orderedIds });
      toast.success("Categories reordered successfully");
    } catch (_error) {
      toast.error("Failed to reorder categories");
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    imageStorageId?: string;
    showInHeader: boolean;
    displayOrder: number;
  }) => {
    setIsLoading(true);
    try {
      if (editingCategory) {
        await updateCategory({
          id: editingCategory._id,
          ...data,
        });
        toast.success("Category updated successfully");
      } else {
        await createCategory(data);
        toast.success("Category created successfully");
      }
      setIsFormOpen(false);
      setEditingCategory(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save category"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    setIsLoading(true);
    try {
      await deleteCategory({ id: deletingCategory._id });
      toast.success("Category deleted successfully");
      setDeletingCategory(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete category"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await updateCategory({
        id: category._id,
        isActive: !category.isActive,
      });
      toast.success(
        `Category ${category.isActive ? "deactivated" : "activated"} successfully`
      );
    } catch (_error) {
      toast.error("Failed to update category status");
    }
  };

  const handleToggleHeader = async (category: Category) => {
    try {
      await updateCategory({
        id: category._id,
        showInHeader: !category.showInHeader,
      });
      toast.success(
        `Category ${category.showInHeader ? "hidden from" : "shown in"} header`
      );
    } catch (_error) {
      toast.error("Failed to update category visibility");
    }
  };

  return (
    <AdminLayout
      breadcrumbs={[
        { label: "Catalog" },
        { label: "Categories" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
            <p className="text-muted-foreground">
              Manage product categories for your store
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Categories
              </CardTitle>
              <FolderTree className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Categories
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {categories.filter((c) => c.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                In Header Navigation
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {categories.filter((c) => c.showInHeader && c.isActive).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
            <CardDescription>
              A list of all product categories. Drag to reorder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoriesData === undefined ? (
              <CategoriesTableSkeleton />
            ) : categories.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No categories yet</h3>
                <p className="text-muted-foreground">
                  Get started by creating your first category.
                </p>
                <Button onClick={handleCreate} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[60px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>In Header</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="categories">
                    {(provided) => (
                      <TableBody
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {categories.map((category, index) => (
                          <Draggable
                            key={category._id}
                            draggableId={category._id}
                            index={index}
                          >
                            {(provided) => (
                              <TableRow
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="bg-background"
                              >
                                <TableCell {...provided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                                </TableCell>
                                <TableCell>
                                  {category.imageUrl ? (
                                    <img
                                      src={category.imageUrl}
                                      alt={category.name}
                                      className="h-10 w-10 rounded object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {category.name}
                                </TableCell>
                                <TableCell>
                                  <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                                    {category.slug}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <span>{category.productCount || 0}</span>
                                    {category.activeProductCount !== undefined &&
                                      category.activeProductCount !== category.productCount && (
                                        <span className="text-muted-foreground">
                                          ({category.activeProductCount} active)
                                        </span>
                                      )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={category.isActive ? "default" : "secondary"}
                                    className="cursor-pointer"
                                    onClick={() => handleToggleActive(category)}
                                  >
                                    {category.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleHeader(category)}
                                    className="gap-1"
                                  >
                                    {category.showInHeader ? (
                                      <>
                                        <Eye className="h-4 w-4" />
                                        Visible
                                      </>
                                    ) : (
                                      <>
                                        <EyeOff className="h-4 w-4" />
                                        Hidden
                                      </>
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(category)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeletingCategory(category)}
                                      disabled={
                                        category.productCount !== undefined &&
                                        category.productCount > 0
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </TableBody>
                    )}
                  </Droppable>
                </DragDropContext>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <CategoryForm
        category={editingCategory}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSave}
        isLoading={isLoading}
        existingCategories={categories}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={() => setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus,
  Edit,
  Trash2,
  Image,
  Video,
  FileText,
  Megaphone,
  LayoutGrid,
  Eye,
  EyeOff,
  Loader2,
  Calendar,
  Link as LinkIcon,
} from "lucide-react";

type ContentType = "banner" | "announcement" | "text_block" | "image" | "video";

interface CMSContent {
  _id: Id<"cmsContent">;
  key: string;
  type: ContentType;
  title?: string;
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  isActive: boolean;
  displayOrder?: number;
  startsAt?: number;
  endsAt?: number;
  createdAt: number;
  updatedAt: number;
}

const CONTENT_TYPE_LABELS: Record<ContentType, { label: string; icon: React.ElementType }> = {
  banner: { label: "Banner", icon: LayoutGrid },
  announcement: { label: "Announcement", icon: Megaphone },
  text_block: { label: "Text Block", icon: FileText },
  image: { label: "Image", icon: Image },
  video: { label: "Video", icon: Video },
};

// Content Form Component
function ContentForm({
  content,
  isOpen,
  onClose,
  onSave,
  isLoading,
}: {
  content?: CMSContent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<CMSContent>) => Promise<void>;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    key: content?.key || "",
    type: content?.type || "banner" as ContentType,
    title: content?.title || "",
    content: content?.content || "",
    imageUrl: content?.imageUrl || "",
    videoUrl: content?.videoUrl || "",
    ctaText: content?.ctaText || "",
    ctaLink: content?.ctaLink || "",
    isActive: content?.isActive ?? true,
    displayOrder: content?.displayOrder || 0,
    startsAt: content?.startsAt ? new Date(content.startsAt).toISOString().slice(0, 16) : "",
    endsAt: content?.endsAt ? new Date(content.endsAt).toISOString().slice(0, 16) : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSave({
      key: formData.key,
      type: formData.type,
      title: formData.title || undefined,
      content: formData.content || undefined,
      imageUrl: formData.imageUrl || undefined,
      videoUrl: formData.videoUrl || undefined,
      ctaText: formData.ctaText || undefined,
      ctaLink: formData.ctaLink || undefined,
      isActive: formData.isActive,
      displayOrder: formData.displayOrder,
      startsAt: formData.startsAt ? new Date(formData.startsAt).getTime() : undefined,
      endsAt: formData.endsAt ? new Date(formData.endsAt).getTime() : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {content ? "Edit Content" : "Create New Content"}
          </DialogTitle>
          <DialogDescription>
            {content ? "Update the content item details" : "Add a new content item to the CMS"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key">Unique Key *</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="hero-banner-1"
                required
                disabled={!!content}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Content Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as ContentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTENT_TYPE_LABELS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter content text"
              rows={4}
            />
          </div>

          {(formData.type === "banner" || formData.type === "image") && (
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}

          {formData.type === "video" && (
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ctaText">CTA Button Text</Label>
              <Input
                id="ctaText"
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                placeholder="Shop Now"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaLink">CTA Button Link</Label>
              <Input
                id="ctaLink"
                value={formData.ctaLink}
                onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                placeholder="/shop"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Start Date (Optional)</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={formData.startsAt}
                onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">End Date (Optional)</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={formData.endsAt}
                onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : content ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCMS() {
  const [typeFilter, setTypeFilter] = useState<ContentType | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<CMSContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"cmsContent"> | null>(null);

  // Fetch content
  const allContent = useQuery(api.cms.listAllContent, {
    type: typeFilter === "all" ? undefined : typeFilter,
    includeInactive: true,
  });

  // Mutations
  const createContent = useMutation(api.cms.createContent);
  const updateContent = useMutation(api.cms.updateContent);
  const deleteContent = useMutation(api.cms.deleteContent);
  const toggleActive = useMutation(api.cms.toggleActive);

  const handleSave = async (data: Partial<CMSContent>) => {
    setIsLoading(true);
    try {
      if (editingContent) {
        await updateContent({
          contentId: editingContent._id,
          ...data,
        });
        toast.success("Content updated successfully");
      } else {
        await createContent(data as any);
        toast.success("Content created successfully");
      }
      setIsFormOpen(false);
      setEditingContent(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (contentId: Id<"cmsContent">) => {
    try {
      await deleteContent({ contentId });
      toast.success("Content deleted");
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete content");
    }
  };

  const handleToggleActive = async (contentId: Id<"cmsContent">) => {
    try {
      const newStatus = await toggleActive({ contentId });
      toast.success(newStatus ? "Content activated" : "Content deactivated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle status");
    }
  };

  const openEditForm = (content: CMSContent) => {
    setEditingContent(content);
    setIsFormOpen(true);
  };

  const openCreateForm = () => {
    setEditingContent(null);
    setIsFormOpen(true);
  };

  return (
    <AdminLayout breadcrumbs={[{ label: "CMS Content" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">CMS Content</h1>
            <p className="text-muted-foreground">
              Manage banners, announcements, and dynamic content
            </p>
          </div>
          <Button onClick={openCreateForm}>
            <Plus className="mr-2 h-4 w-4" />
            Add Content
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(CONTENT_TYPE_LABELS).map(([type, { label, icon: Icon }]) => {
            const count = allContent?.filter((c) => c.type === type).length || 0;
            const activeCount = allContent?.filter((c) => c.type === type && c.isActive).length || 0;
            return (
              <Card key={type}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">
                        {label}s ({activeCount} active)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ContentType | "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(CONTENT_TYPE_LABELS).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allContent === undefined ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : allContent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No content found</p>
                    <Button className="mt-4" onClick={openCreateForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Content
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                allContent.map((item) => {
                  const TypeIcon = CONTENT_TYPE_LABELS[item.type as ContentType]?.icon || FileText;
                  return (
                    <TableRow key={item._id}>
                      <TableCell className="font-mono text-sm">{item.key}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{CONTENT_TYPE_LABELS[item.type as ContentType]?.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.title || item.content?.slice(0, 50) || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.startsAt || item.endsAt ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {item.startsAt && format(new Date(item.startsAt), "MMM d")}
                            {item.startsAt && item.endsAt && " - "}
                            {item.endsAt && format(new Date(item.endsAt), "MMM d")}
                          </div>
                        ) : (
                          "Always"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(item.updatedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(item._id)}
                            title={item.isActive ? "Deactivate" : "Activate"}
                          >
                            {item.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(item as CMSContent)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive/80"
                            onClick={() => setDeleteConfirmId(item._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Content Form Dialog */}
        <ContentForm
          content={editingContent}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingContent(null);
          }}
          onSave={handleSave}
          isLoading={isLoading}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Content</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this content? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

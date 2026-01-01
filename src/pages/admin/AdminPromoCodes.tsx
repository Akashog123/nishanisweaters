import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Tag,
  Percent,
  IndianRupee,
  Loader2,
  Calendar,
  Users,
  ShoppingCart,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";

interface PromoCode {
  _id: Id<"promoCodes">;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usagePerUser?: number;
  currentUsageCount: number;
  startsAt: number;
  expiresAt?: number;
  applicableCategories?: string[];
  excludeWholesale: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// Promo Code Form Component
function PromoCodeForm({
  promoCode,
  isOpen,
  onClose,
  onSave,
  isLoading,
}: {
  promoCode?: PromoCode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    code: string;
    description: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    usagePerUser?: number;
    startsAt: number;
    expiresAt?: number;
    applicableCategories?: string[];
    excludeWholesale: boolean;
    isActive: boolean;
  }) => Promise<void>;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    code: promoCode?.code || "",
    description: promoCode?.description || "",
    discountType: promoCode?.discountType || "percentage" as "percentage" | "fixed",
    discountValue: promoCode?.discountValue || 10,
    minOrderAmount: promoCode?.minOrderAmount || "",
    maxDiscountAmount: promoCode?.maxDiscountAmount || "",
    usageLimit: promoCode?.usageLimit || "",
    usagePerUser: promoCode?.usagePerUser || "",
    startsAt: promoCode?.startsAt
      ? new Date(promoCode.startsAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    expiresAt: promoCode?.expiresAt
      ? new Date(promoCode.expiresAt).toISOString().slice(0, 16)
      : "",
    excludeWholesale: promoCode?.excludeWholesale ?? false,
    isActive: promoCode?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error("Please enter a promo code");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (formData.discountValue <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }

    if (formData.discountType === "percentage" && formData.discountValue > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    await onSave({
      code: formData.code.toUpperCase().trim(),
      description: formData.description.trim(),
      discountType: formData.discountType,
      discountValue: formData.discountValue,
      minOrderAmount: formData.minOrderAmount ? Number(formData.minOrderAmount) : undefined,
      maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : undefined,
      usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
      usagePerUser: formData.usagePerUser ? Number(formData.usagePerUser) : undefined,
      startsAt: new Date(formData.startsAt).getTime(),
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).getTime() : undefined,
      excludeWholesale: formData.excludeWholesale,
      isActive: formData.isActive,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {promoCode ? "Edit Promo Code" : "Create New Promo Code"}
          </DialogTitle>
          <DialogDescription>
            {promoCode ? "Update the promo code details" : "Add a new promotional code"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Promo Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER20"
                className="uppercase"
                disabled={!!promoCode}
              />
              {promoCode && (
                <p className="text-xs text-muted-foreground">Code cannot be changed after creation</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountType">Discount Type *</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value) => setFormData({ ...formData, discountType: value as "percentage" | "fixed" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Summer sale 20% off"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountValue">
                Discount Value * {formData.discountType === "percentage" ? "(%)" : "(Amount)"}
              </Label>
              <Input
                id="discountValue"
                type="number"
                min="0"
                max={formData.discountType === "percentage" ? "100" : undefined}
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
              />
            </div>

            {formData.discountType === "percentage" && (
              <div className="space-y-2">
                <Label htmlFor="maxDiscountAmount">Max Discount Amount</Label>
                <Input
                  id="maxDiscountAmount"
                  type="number"
                  min="0"
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                  placeholder="500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minOrderAmount">Minimum Order Amount</Label>
              <Input
                id="minOrderAmount"
                type="number"
                min="0"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                placeholder="1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageLimit">Total Usage Limit</Label>
              <Input
                id="usageLimit"
                type="number"
                min="0"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                placeholder="100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usagePerUser">Usage Per User</Label>
              <Input
                id="usagePerUser"
                type="number"
                min="0"
                value={formData.usagePerUser}
                onChange={(e) => setFormData({ ...formData, usagePerUser: e.target.value })}
                placeholder="1"
              />
            </div>

            <div className="space-y-2 flex items-end">
              <div className="flex items-center space-x-2">
                <Switch
                  id="excludeWholesale"
                  checked={formData.excludeWholesale}
                  onCheckedChange={(checked) => setFormData({ ...formData, excludeWholesale: checked })}
                />
                <Label htmlFor="excludeWholesale">Exclude Wholesale Customers</Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Starts At *</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={formData.startsAt}
                onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave empty for no expiration</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {promoCode ? "Update" : "Create"} Promo Code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPromoCodes() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const promoCodes = useQuery(api.promoCodes.listPromoCodes, {
    limit: 100,
    status: filterStatus === "all" ? undefined : filterStatus,
  });

  const createPromoCode = useMutation(api.promoCodes.createPromoCode);
  const updatePromoCode = useMutation(api.promoCodes.updatePromoCode);
  const deletePromoCode = useMutation(api.promoCodes.deletePromoCode);
  const toggleStatus = useMutation(api.promoCodes.togglePromoCodeStatus);

  const handleOpenForm = (promoCode?: PromoCode) => {
    setEditingPromoCode(promoCode || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPromoCode(null);
  };

  const handleSave = async (data: Parameters<typeof createPromoCode>[0]) => {
    setIsLoading(true);
    try {
      if (editingPromoCode) {
        await updatePromoCode({
          promoCodeId: editingPromoCode._id,
          ...data,
        });
        toast.success("Promo code updated successfully");
      } else {
        await createPromoCode(data);
        toast.success("Promo code created successfully");
      }
      handleCloseForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save promo code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: Id<"promoCodes">) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;

    try {
      await deletePromoCode({ promoCodeId: id });
      toast.success("Promo code deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete promo code");
    }
  };

  const handleToggleStatus = async (id: Id<"promoCodes">) => {
    try {
      await toggleStatus({ promoCodeId: id });
      toast.success("Status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  const getPromoCodeStatus = (code: PromoCode) => {
    const now = Date.now();
    if (!code.isActive) return { label: "Inactive", variant: "secondary" as const };
    if (code.startsAt > now) return { label: "Scheduled", variant: "outline" as const };
    if (code.expiresAt && code.expiresAt < now) return { label: "Expired", variant: "destructive" as const };
    if (code.usageLimit && code.currentUsageCount >= code.usageLimit) {
      return { label: "Limit Reached", variant: "destructive" as const };
    }
    return { label: "Active", variant: "default" as const };
  };

  // Calculate stats
  const activeCount = promoCodes?.promoCodes.filter(
    (c) => c.isActive && (!c.expiresAt || c.expiresAt > Date.now())
  ).length || 0;
  const totalUsage = promoCodes?.promoCodes.reduce((sum, c) => sum + c.currentUsageCount, 0) || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Promo Codes</h1>
            <p className="text-muted-foreground">
              Manage promotional codes and discounts
            </p>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Promo Code
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="Total Promo Codes"
            value={promoCodes?.promoCodes.length || 0}
            icon={Tag}
          />
          <StatsCard
            title="Active Codes"
            value={activeCount}
            icon={Percent}
          />
          <StatsCard
            title="Total Redemptions"
            value={totalUsage}
            icon={Users}
          />
          <StatsCard
            title="Codes Used Today"
            value="-"
            icon={ShoppingCart}
            description="Coming soon"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Select
                value={filterStatus}
                onValueChange={(value) => setFilterStatus(value as "all" | "active" | "inactive")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Promo Codes Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Promo Codes</CardTitle>
            <CardDescription>
              A list of all promotional codes in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!promoCodes ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : promoCodes.promoCodes.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No promo codes found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first promotional code to get started
                </p>
                <Button onClick={() => handleOpenForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Promo Code
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Valid Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.promoCodes.map((code) => {
                    const status = getPromoCodeStatus(code);
                    return (
                      <TableRow key={code._id}>
                        <TableCell>
                          <div>
                            <div className="font-mono font-bold">{code.code}</div>
                            <div className="text-xs text-muted-foreground">
                              {code.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {code.discountType === "percentage" ? (
                              <>
                                <Percent className="h-4 w-4" />
                                {code.discountValue}%
                              </>
                            ) : (
                              <>
                                <IndianRupee className="h-4 w-4" />
                                {formatCurrency(code.discountValue)}
                              </>
                            )}
                          </div>
                          {code.minOrderAmount && (
                            <div className="text-xs text-muted-foreground">
                              Min: {formatCurrency(code.minOrderAmount)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            {code.currentUsageCount}
                            {code.usageLimit && ` / ${code.usageLimit}`}
                          </div>
                          {code.usagePerUser && (
                            <div className="text-xs text-muted-foreground">
                              {code.usagePerUser} per user
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(code.startsAt), "MMM d, yyyy")}
                          </div>
                          {code.expiresAt && (
                            <div className="text-xs text-muted-foreground">
                              to {format(new Date(code.expiresAt), "MMM d, yyyy")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {code.excludeWholesale && (
                            <Badge variant="outline" className="ml-1">
                              Retail Only
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={code.isActive}
                            onCheckedChange={() => handleToggleStatus(code._id)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenForm(code)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(code._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <PromoCodeForm
          promoCode={editingPromoCode}
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSave={handleSave}
          isLoading={isLoading}
        />
      </div>
    </AdminLayout>
  );
}

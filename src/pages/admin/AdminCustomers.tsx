import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Users,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/formatting";
import { logger } from "@/lib/logger";

// Role Badge
const RoleBadge = ({ role }: { role: string }) => {
  const roleConfig: Record<
    string,
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    customer: { variant: "outline", label: "Customer", icon: ShoppingBag },
    admin: { variant: "default", label: "Admin", icon: Shield },
  };

  const config = roleConfig[role] || { variant: "outline" as const, label: role, icon: User };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Shipping address type
interface ShippingAddress {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

// Customer Details Dialog
const CustomerDetailsDialog = ({
  customer,
  open,
  onOpenChange,
  onUpdateRole,
}: {
  customer: Doc<"users"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateRole: (userId: Id<"users">, role: string) => void;
}) => {
  const [selectedRole, setSelectedRole] = useState<string>(customer?.role || "customer");
  const [isUpdating, setIsUpdating] = useState(false);

  if (!customer) return null;

  const handleRoleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdateRole(customer._id, selectedRole);
      onOpenChange(false);
    } catch (error) {
      logger.error("Error updating role", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {customer.firstName || customer.lastName
              ? `${customer.firstName || ""} ${customer.lastName || ""}`
              : customer.email}
            <RoleBadge role={customer.role} />
          </DialogTitle>
          <DialogDescription>
            Member since {formatDate(customer.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Last login:{" "}
                    {customer.lastLoginAt
                      ? formatDateTime(customer.lastLoginAt)
                      : "Never"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Clerk ID: {customer.clerkId.slice(0, 12)}...</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Addresses */}
          {customer.shippingAddresses && customer.shippingAddresses.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Shipping Addresses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customer.shippingAddresses.map((address: ShippingAddress, index: number) => (
                    <div
                      key={address.id || index}
                      className="p-3 bg-gray-50 rounded-lg text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{address.name}</span>
                        {address.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">{address.street}</p>
                      <p className="text-muted-foreground">
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p className="text-muted-foreground">{address.country}</p>
                      {address.phone && (
                        <p className="text-muted-foreground mt-1">
                          Phone: {address.phone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role Management */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>User Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {selectedRole !== customer.role && (
            <Button onClick={handleRoleUpdate} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Role"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AdminCustomers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Doc<"users"> | null>(null);
  const itemsPerPage = 10;

  // Fetch users
  const usersResult = useQuery(api.users.listUsers, {});
  const allUsers = usersResult?.users ?? [];

  // Mutations
  const updateUserRole = useMutation(api.users.updateUserRole);

  // Filter users
  const filteredUsers = allUsers.filter((user) => {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fullName.includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle role update
  const handleUpdateRole = async (userId: Id<"users">, role: string) => {
    try {
      await updateUserRole({
        userId,
        role: role as "customer" | "admin",
      });
      toast.success("User role updated successfully");
    } catch (error) {
      toast.error("Failed to update user role");
      throw error;
    }
  };

  // Count users by role
  const roleCounts = {
    all: allUsers.length,
    customer: allUsers.filter((u) => u.role === "customer").length,
    admin: allUsers.filter((u) => u.role === "admin").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground">Manage user accounts and roles</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className={`cursor-pointer transition-colors ${
              roleFilter === "all" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setRoleFilter("all")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleCounts.all}</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              roleFilter === "customer" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setRoleFilter("customer")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleCounts.customer}</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              roleFilter === "admin" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setRoleFilter("admin")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleCounts.admin}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>User List</CardTitle>
            <CardDescription>{filteredUsers.length} users found</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.firstName || user.lastName
                              ? `${user.firstName || ""} ${user.lastName || ""}`
                              : "No Name"}
                          </div>
                          {user.phone && (
                            <div className="text-xs text-muted-foreground">
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="truncate max-w-[180px]">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(user.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedCustomer(user)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedUsers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No users found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of{" "}
                  {filteredUsers.length} users
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Details Dialog */}
        <CustomerDetailsDialog
          customer={selectedCustomer}
          open={!!selectedCustomer}
          onOpenChange={(open) => {
            if (!open) setSelectedCustomer(null);
          }}
          onUpdateRole={handleUpdateRole}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminCustomers;

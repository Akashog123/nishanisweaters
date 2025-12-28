import { useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Heart,
  Edit2,
  Trash2,
  Plus,
  ChevronRight,
  Bell,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

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

export default function Account() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  // Address form state
  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    isDefault: false,
  });

  // Convex queries and mutations
  // Using getCurrentUserProfile which gets user from server-side identity (no clerkId needed)
  const convexUser = useQuery(
    api.users.getCurrentUserProfile,
    isSignedIn ? {} : "skip"
  );

  const updateProfile = useMutation(api.users.updateUserProfile);
  const addAddress = useMutation(api.users.addShippingAddress);
  const updateAddress = useMutation(api.users.updateShippingAddress);
  const deleteAddress = useMutation(api.users.deleteShippingAddress);

  // Loading state
  if (!isClerkLoaded) {
    return (
      <Layout showAnnouncement={false}>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <Layout showAnnouncement={false}>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Sign in to view your account</CardTitle>
              <CardDescription>
                Access your profile, orders, and wishlist by signing in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link to="/sign-in">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const handleEditProfile = () => {
    setProfileForm({
      firstName: convexUser?.firstName || user.firstName || "",
      lastName: convexUser?.lastName || user.lastName || "",
      phone: convexUser?.phone || "",
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        firstName: profileForm.firstName || undefined,
        lastName: profileForm.lastName || undefined,
        phone: profileForm.phone || undefined,
      });
      toast.success("Profile updated successfully");
      setIsEditingProfile(false);
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleAddAddress = async () => {
    try {
      await addAddress({
        ...addressForm,
      });
      toast.success("Address added successfully");
      setIsAddingAddress(false);
      resetAddressForm();
    } catch (error) {
      toast.error("Failed to add address");
    }
  };

  const handleUpdateAddress = async () => {
    if (!editingAddress) return;
    try {
      await updateAddress({
        addressId: editingAddress.id,
        ...addressForm,
      });
      toast.success("Address updated successfully");
      setEditingAddress(null);
      resetAddressForm();
    } catch (error) {
      toast.error("Failed to update address");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await deleteAddress({
        addressId,
      });
      toast.success("Address deleted successfully");
    } catch (error) {
      toast.error("Failed to delete address");
    }
  };

  const handleNotificationChange = async (type: "email" | "sms", value: boolean) => {
    try {
      await updateProfile({
        ...(type === "email" ? { emailNotifications: value } : { smsNotifications: value }),
      });
      toast.success("Notification preferences updated");
    } catch (error) {
      toast.error("Failed to update preferences");
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      name: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
      isDefault: false,
    });
  };

  const openEditAddress = (address: ShippingAddress) => {
    setAddressForm({
      name: address.name,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setEditingAddress(address);
  };

  const displayName = convexUser?.firstName || user.firstName || "User";
  const displayEmail = convexUser?.email || user.emailAddresses[0]?.emailAddress || "";
  const displayPhone = convexUser?.phone || "";

  return (
    <Layout showAnnouncement={false}>
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">My Account</h1>
            <p className="text-muted-foreground">
              Manage your profile, addresses, and preferences
            </p>
          </div>

          <div className="grid gap-6">
            {/* Profile Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Your personal details and contact information
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleEditProfile}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">
                        {convexUser?.firstName || user.firstName || ""}{" "}
                        {convexUser?.lastName || user.lastName || ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{displayEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{displayPhone || "Not provided"}</p>
                    </div>
                  </div>
                  {convexUser?.role && (
                    <div className="flex items-center gap-3">
                      <Badge variant={convexUser.role === "admin" ? "default" : "secondary"}>
                        {convexUser.role.charAt(0).toUpperCase() + convexUser.role.slice(1)}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Link to="/order-history">
                <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Order History</p>
                        <p className="text-sm text-muted-foreground">View your past orders</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>

              <Link to="/wishlist">
                <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Heart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Wishlist</p>
                        <p className="text-sm text-muted-foreground">Items you saved for later</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Shipping Addresses */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Addresses
                  </CardTitle>
                  <CardDescription>
                    Manage your delivery addresses
                  </CardDescription>
                </div>
                <Dialog open={isAddingAddress} onOpenChange={setIsAddingAddress}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => resetAddressForm()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Address
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New Address</DialogTitle>
                      <DialogDescription>
                        Enter the details for your new shipping address.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={addressForm.name}
                            onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                            placeholder="John Doe"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={addressForm.phone}
                            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                            placeholder="+91 9876543210"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="street">Street Address</Label>
                        <Input
                          id="street"
                          value={addressForm.street}
                          onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                          placeholder="123 Main Street"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            placeholder="Mumbai"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                            placeholder="Maharashtra"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="postalCode">Postal Code</Label>
                          <Input
                            id="postalCode"
                            value={addressForm.postalCode}
                            onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                            placeholder="400001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            value={addressForm.country}
                            onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                            placeholder="India"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isDefault"
                          checked={addressForm.isDefault}
                          onCheckedChange={(checked) => setAddressForm({ ...addressForm, isDefault: checked })}
                        />
                        <Label htmlFor="isDefault">Set as default address</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingAddress(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddAddress}>Save Address</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {convexUser?.shippingAddresses && convexUser.shippingAddresses.length > 0 ? (
                  <div className="grid gap-4">
                    {convexUser.shippingAddresses.map((address: ShippingAddress) => (
                      <div
                        key={address.id}
                        className="flex items-start justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{address.name}</p>
                            {address.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{address.phone}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {address.street}, {address.city}, {address.state} {address.postalCode}
                          </p>
                          <p className="text-sm text-muted-foreground">{address.country}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditAddress(address)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteAddress(address.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No addresses saved yet</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsAddingAddress(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Address
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to receive updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive order updates and promotions via email
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={convexUser?.emailNotifications ?? true}
                    onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">SMS Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive order updates via SMS
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={convexUser?.smsNotifications ?? false}
                    onCheckedChange={(checked) => handleNotificationChange("sms", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Profile Dialog */}
        <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update your personal information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profilePhone">Phone Number</Label>
                <Input
                  id="profilePhone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Address Dialog */}
        <Dialog open={!!editingAddress} onOpenChange={(open) => !open && setEditingAddress(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Address</DialogTitle>
              <DialogDescription>
                Update your shipping address details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Full Name</Label>
                  <Input
                    id="editName"
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Phone</Label>
                  <Input
                    id="editPhone"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editStreet">Street Address</Label>
                <Input
                  id="editStreet"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editCity">City</Label>
                  <Input
                    id="editCity"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editState">State</Label>
                  <Input
                    id="editState"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editPostalCode">Postal Code</Label>
                  <Input
                    id="editPostalCode"
                    value={addressForm.postalCode}
                    onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCountry">Country</Label>
                  <Input
                    id="editCountry"
                    value={addressForm.country}
                    onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editIsDefault"
                  checked={addressForm.isDefault}
                  onCheckedChange={(checked) => setAddressForm({ ...addressForm, isDefault: checked })}
                />
                <Label htmlFor="editIsDefault">Set as default address</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingAddress(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateAddress}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

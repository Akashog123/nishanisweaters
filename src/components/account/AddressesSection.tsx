import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
import { MapPin, Edit2, Trash2, Plus } from "lucide-react";
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

interface AddressesSectionProps {
  addresses: ShippingAddress[] | undefined;
  embedded?: boolean;
}

export function AddressesSection({ addresses, embedded = false }: AddressesSectionProps) {
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
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

  const addAddress = useMutation(api.users.addShippingAddress);
  const updateAddress = useMutation(api.users.updateShippingAddress);
  const deleteAddress = useMutation(api.users.deleteShippingAddress);

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

  const handleAddAddress = async () => {
    try {
      await addAddress({ ...addressForm });
      toast.success("Address added successfully");
      setIsAddingAddress(false);
      resetAddressForm();
    } catch {
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
    } catch {
      toast.error("Failed to update address");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await deleteAddress({ addressId });
      toast.success("Address deleted successfully");
    } catch {
      toast.error("Failed to delete address");
    }
  };

  const AddressFormFields = ({ idPrefix = "" }: { idPrefix?: string }) => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}name`}>Full Name</Label>
          <Input
            id={`${idPrefix}name`}
            value={addressForm.name}
            onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}phone`}>Phone</Label>
          <Input
            id={`${idPrefix}phone`}
            value={addressForm.phone}
            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
            placeholder="+91 9876543210"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}street`}>Street Address</Label>
        <Input
          id={`${idPrefix}street`}
          value={addressForm.street}
          onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
          placeholder="123 Main Street"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}city`}>City</Label>
          <Input
            id={`${idPrefix}city`}
            value={addressForm.city}
            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
            placeholder="Mumbai"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}state`}>State</Label>
          <Input
            id={`${idPrefix}state`}
            value={addressForm.state}
            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
            placeholder="Maharashtra"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}postalCode`}>Postal Code</Label>
          <Input
            id={`${idPrefix}postalCode`}
            value={addressForm.postalCode}
            onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
            placeholder="400001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}country`}>Country</Label>
          <Input
            id={`${idPrefix}country`}
            value={addressForm.country}
            onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
            placeholder="India"
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id={`${idPrefix}isDefault`}
          checked={addressForm.isDefault}
          onCheckedChange={(checked) => setAddressForm({ ...addressForm, isDefault: checked })}
        />
        <Label htmlFor={`${idPrefix}isDefault`}>Set as default address</Label>
      </div>
    </div>
  );

  const addressList = (
    <>
      {addresses && addresses.length > 0 ? (
        <div className="grid gap-4">
          {addresses.map((address: ShippingAddress) => (
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
    </>
  );

  const addAddressDialog = (
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
        <AddressFormFields />
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddingAddress(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddAddress}>Save Address</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const editAddressDialog = (
    <Dialog open={!!editingAddress} onOpenChange={(open) => !open && setEditingAddress(null)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Address</DialogTitle>
          <DialogDescription>
            Update your shipping address details.
          </DialogDescription>
        </DialogHeader>
        <AddressFormFields />
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingAddress(null)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateAddress}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Inline form for embedded mode (avoids dialog-in-modal issues)
  const inlineAddForm = isAddingAddress && (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Add New Address</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsAddingAddress(false);
            resetAddressForm();
          }}
        >
          Cancel
        </Button>
      </div>
      <AddressFormFields idPrefix="add-" />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setIsAddingAddress(false);
            resetAddressForm();
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleAddAddress}>Save Address</Button>
      </div>
    </div>
  );

  const inlineEditForm = editingAddress && (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Edit Address</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingAddress(null);
            resetAddressForm();
          }}
        >
          Cancel
        </Button>
      </div>
      <AddressFormFields idPrefix="edit-" />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setEditingAddress(null);
            resetAddressForm();
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleUpdateAddress}>Save Changes</Button>
      </div>
    </div>
  );

  // Embedded mode for Clerk UserProfile pages - uses inline forms instead of dialogs
  if (embedded) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Shipping Addresses</h3>
            <p className="text-sm text-muted-foreground">
              Manage your delivery addresses
            </p>
          </div>
          {!isAddingAddress && !editingAddress && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetAddressForm();
                setIsAddingAddress(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          )}
        </div>
        {inlineAddForm}
        {inlineEditForm}
        {!isAddingAddress && !editingAddress && addressList}
      </div>
    );
  }

  // Card mode for standalone page
  return (
    <>
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
          {addAddressDialog}
        </CardHeader>
        <CardContent>
          {addressList}
        </CardContent>
      </Card>
      {editAddressDialog}
    </>
  );
}

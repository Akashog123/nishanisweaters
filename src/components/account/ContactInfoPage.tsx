import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export function ContactInfoPage() {
  const { isSignedIn } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phone, setPhone] = useState("");

  const convexUser = useQuery(
    api.users.getCurrentUserProfile,
    isSignedIn ? {} : "skip"
  );

  const updateProfile = useMutation(api.users.updateUserProfile);

  const handleEdit = () => {
    setPhone(convexUser?.phone || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ phone: phone || undefined });
      toast.success("Phone number updated");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update phone number");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPhone(convexUser?.phone || "");
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 p-1">
      <div>
        <h3 className="text-lg font-semibold mb-1">Contact Information</h3>
        <p className="text-sm text-muted-foreground">
          Your phone number for order updates and delivery coordination
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 border rounded-lg">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Phone className="h-5 w-5 text-muted-foreground" />
          </div>

          {isEditing ? (
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  disabled={isSaving}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium">
                  {convexUser?.phone || "Not provided"}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleEdit}>
                {convexUser?.phone ? "Change" : "Add"}
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          This phone number is used for delivery coordination and order-related communications.
          It is separate from Clerk authentication phone numbers.
        </p>
      </div>
    </div>
  );
}

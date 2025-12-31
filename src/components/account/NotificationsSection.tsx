import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface NotificationsSectionProps {
  emailNotifications: boolean | undefined;
  smsNotifications: boolean | undefined;
  embedded?: boolean;
}

export function NotificationsSection({
  emailNotifications,
  smsNotifications,
  embedded = false,
}: NotificationsSectionProps) {
  const updateProfile = useMutation(api.users.updateUserProfile);

  const handleNotificationChange = async (type: "email" | "sms", value: boolean) => {
    try {
      await updateProfile({
        ...(type === "email" ? { emailNotifications: value } : { smsNotifications: value }),
      });
      toast.success("Notification preferences updated");
    } catch {
      toast.error("Failed to update preferences");
    }
  };

  const content = (
    <div className="space-y-4">
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
          checked={emailNotifications ?? true}
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
          checked={smsNotifications ?? false}
          onCheckedChange={(checked) => handleNotificationChange("sms", checked)}
        />
      </div>
    </div>
  );

  // Embedded mode for Clerk UserProfile pages
  if (embedded) {
    return (
      <div className="space-y-6 p-1">
        <div>
          <h3 className="text-lg font-semibold">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Choose how you want to receive updates
          </p>
        </div>
        {content}
      </div>
    );
  }

  // Card mode for standalone page
  return (
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
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}

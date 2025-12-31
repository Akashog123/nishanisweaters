import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { NotificationsSection } from "./NotificationsSection";
import { Loader2 } from "lucide-react";

export function ClerkNotificationsPage() {
  const { isSignedIn } = useUser();

  const convexUser = useQuery(
    api.users.getCurrentUserProfile,
    isSignedIn ? {} : "skip"
  );

  if (convexUser === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <NotificationsSection
      emailNotifications={convexUser?.emailNotifications}
      smsNotifications={convexUser?.smsNotifications}
      embedded
    />
  );
}

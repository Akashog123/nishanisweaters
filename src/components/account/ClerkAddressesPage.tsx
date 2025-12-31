import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AddressesSection } from "./AddressesSection";
import { Loader2 } from "lucide-react";

export function ClerkAddressesPage() {
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
    <AddressesSection
      addresses={convexUser?.shippingAddresses}
      embedded
    />
  );
}

import { UserButton } from "@clerk/clerk-react";
import { Package, Settings, Phone, MapPin, Bell } from "lucide-react";
import { ContactInfoPage } from "@/components/account/ContactInfoPage";
import { ClerkAddressesPage } from "@/components/account/ClerkAddressesPage";
import { ClerkNotificationsPage } from "@/components/account/ClerkNotificationsPage";

/**
 * Encapsulates Clerk's UserButton with custom profile pages.
 * Lazy-loaded from Header to defer heavy Clerk UI + custom page imports
 * out of the critical rendering path.
 */
export default function HeaderUserButton({ isAdmin }: { isAdmin: boolean }) {
  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: "h-8 w-8"
        }
      }}
    >
      <UserButton.UserProfilePage
        label="Contact Info"
        labelIcon={<Phone className="h-4 w-4" />}
        url="contact"
      >
        <ContactInfoPage />
      </UserButton.UserProfilePage>

      <UserButton.UserProfilePage
        label="Addresses"
        labelIcon={<MapPin className="h-4 w-4" />}
        url="addresses"
      >
        <ClerkAddressesPage />
      </UserButton.UserProfilePage>

      <UserButton.UserProfilePage
        label="Notifications"
        labelIcon={<Bell className="h-4 w-4" />}
        url="notifications"
      >
        <ClerkNotificationsPage />
      </UserButton.UserProfilePage>

      <UserButton.MenuItems>
        {/* Order History - hidden for admin users */}
        {!isAdmin && (
          <UserButton.Link
            label="Order History"
            labelIcon={<Package className="h-4 w-4" />}
            href="/orders"
          />
        )}
        {isAdmin && (
          <UserButton.Link
            label="Admin Dashboard"
            labelIcon={<Settings className="h-4 w-4" />}
            href="/admin"
          />
        )}
      </UserButton.MenuItems>
    </UserButton>
  );
}

import { useUser, useClerk } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PageLoader } from "@/components/routes/PageLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "customer" | "wholesale" | "admin";
  blockAdminAccess?: boolean;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useUser();
  const { openSignIn } = useClerk();

  // SECURITY: Use server-side identity verification - never pass client clerkId
  const dbUser = useQuery(
    api.users.getCurrentUser,
    isSignedIn ? {} : "skip"
  );

  if (!isLoaded) {
    return <PageLoader fullScreen />;
  }

  if (!isSignedIn) {
    // Open Clerk sign-in modal directly instead of redirecting to home
    openSignIn();
    return null;
  }

  // If role check is required, wait for user data (undefined means still loading)
  if (requiredRole && dbUser === undefined) {
    return <PageLoader fullScreen />;
  }

  // Handle case where user is not found in database (null)
  if (requiredRole && dbUser === null) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && dbUser && dbUser.role !== requiredRole) {
    // Allow admins to access everything
    if (dbUser.role !== "admin") {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

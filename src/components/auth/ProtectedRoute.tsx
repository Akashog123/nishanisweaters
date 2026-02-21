import { useUser, useClerk } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    // Open Clerk sign-in modal directly instead of redirecting to home
    openSignIn();
    return null;
  }

  // If role check is required, wait for user data (undefined means still loading)
  if (requiredRole && dbUser === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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

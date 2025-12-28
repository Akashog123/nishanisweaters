import { useUser } from "@clerk/clerk-react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "customer" | "wholesale" | "admin";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isSignedIn, user, isLoaded } = useUser();
  const location = useLocation();

  const dbUser = useQuery(
    api.users.getCurrentUser,
    isSignedIn && user ? { clerkId: user.id } : "skip"
  );

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" state={{ from: location }} replace />;
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

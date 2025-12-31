/**
 * Admin Route Wrapper
 *
 * Wraps admin pages with ErrorBoundary, ProtectedRoute (admin role),
 * and Suspense for consistent error handling and lazy loading.
 */

import { Suspense, ComponentType } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import ErrorFallback from "@/components/ErrorFallback";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PageLoader } from "./PageLoader";

interface AdminRouteProps {
  component: ComponentType;
}

/**
 * AdminRoute provides:
 * - ErrorBoundary with detailed error display (for admin troubleshooting)
 * - ProtectedRoute with requiredRole="admin"
 * - Suspense with PageLoader for lazy-loaded components
 */
export function AdminRoute({ component: Component }: AdminRouteProps) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <ErrorFallback error={error} resetError={reset} showDetails={true} />
      )}
    >
      <ProtectedRoute requiredRole="admin">
        <Suspense fallback={<PageLoader />}>
          <Component />
        </Suspense>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}

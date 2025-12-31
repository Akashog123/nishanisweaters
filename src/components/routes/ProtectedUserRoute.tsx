/**
 * Protected User Route Wrapper
 *
 * Wraps authenticated user pages (not admin) with ErrorBoundary,
 * ProtectedRoute, and Suspense.
 */

import { Suspense, ComponentType } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PageLoader } from "./PageLoader";

interface ProtectedUserRouteProps {
  component: ComponentType;
}

/**
 * ProtectedUserRoute provides:
 * - ErrorBoundary for error isolation
 * - ProtectedRoute (requires authentication, no specific role)
 * - Suspense with PageLoader for lazy-loaded components
 */
export function ProtectedUserRoute({ component: Component }: ProtectedUserRouteProps) {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}>
          <Component />
        </Suspense>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}

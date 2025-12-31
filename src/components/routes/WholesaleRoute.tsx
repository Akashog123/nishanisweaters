/**
 * Wholesale Route Wrapper
 *
 * Wraps wholesale user pages with ErrorBoundary, ProtectedRoute
 * (wholesale role), and Suspense.
 */

import { Suspense, ComponentType } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PageLoader } from "./PageLoader";

interface WholesaleRouteProps {
  component: ComponentType;
  /** If true, requires only authentication (for registration page) */
  allowPending?: boolean;
}

/**
 * WholesaleRoute provides:
 * - ErrorBoundary for error isolation
 * - ProtectedRoute with requiredRole="wholesale" (unless allowPending)
 * - Suspense with PageLoader for lazy-loaded components
 */
export function WholesaleRoute({ component: Component, allowPending = false }: WholesaleRouteProps) {
  return (
    <ErrorBoundary>
      <ProtectedRoute requiredRole={allowPending ? undefined : "wholesale"}>
        <Suspense fallback={<PageLoader />}>
          <Component />
        </Suspense>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}

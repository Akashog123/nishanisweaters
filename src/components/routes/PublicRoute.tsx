/**
 * Public Route Wrapper
 *
 * Wraps public pages with ErrorBoundary and optional Suspense
 * for lazy-loaded components.
 */

import { Suspense, ComponentType, ReactElement } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PageLoader } from "./PageLoader";

interface PublicRouteProps {
  /** The component to render */
  component?: ComponentType;
  /** Alternatively, pass children directly */
  children?: ReactElement;
  /** Whether to use Suspense (for lazy-loaded components) */
  lazy?: boolean;
}

/**
 * PublicRoute provides:
 * - ErrorBoundary for error isolation
 * - Optional Suspense with PageLoader for lazy-loaded components
 */
export function PublicRoute({ component: Component, children, lazy = false }: PublicRouteProps) {
  const content = Component ? <Component /> : children;

  if (lazy && Component) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Component />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {content}
    </ErrorBoundary>
  );
}

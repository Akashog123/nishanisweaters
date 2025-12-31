/**
 * Route Renderer
 *
 * Utility function to render routes from configuration objects.
 * This eliminates repetitive route patterns by wrapping each route
 * with the appropriate ErrorBoundary, ProtectedRoute, and Suspense.
 */

import { Suspense } from 'react';
import { Route } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import ErrorFallback from '@/components/ErrorFallback';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageLoader } from './PageLoader';
import type { RouteConfig } from '@/config/routes';

/**
 * Renders a single route element with appropriate wrappers
 */
function RouteElement({ route }: { route: RouteConfig }) {
  const Component = route.component;
  const showDetails = route.showErrorDetails ?? false;
  const isLazy = route.isLazy ?? true;

  // Create the error boundary fallback based on showDetails
  const errorFallback = showDetails
    ? (error: Error, reset: () => void) => (
        <ErrorFallback error={error} resetError={reset} showDetails={true} />
      )
    : undefined;

  // Build the content with proper nesting
  let content = <Component />;

  // Wrap in Suspense if lazy loaded
  if (isLazy) {
    content = <Suspense fallback={<PageLoader />}>{content}</Suspense>;
  }

  // Wrap in ProtectedRoute if authentication is required
  // requiredRole === undefined means auth only (no specific role required)
  // route has requiredRole key means it needs auth
  if (route.requiredRole !== undefined || 'requiredRole' in route === false && isProtectedRoute(route)) {
    content = (
      <ProtectedRoute requiredRole={route.requiredRole}>
        {content}
      </ProtectedRoute>
    );
  }

  // Always wrap in ErrorBoundary
  return (
    <ErrorBoundary fallback={errorFallback}>
      {content}
    </ErrorBoundary>
  );
}

/**
 * Helper to determine if a route needs protection based on its configuration
 * Routes in protectedRoutes array or with requiredRole need auth
 */
function isProtectedRoute(route: RouteConfig): boolean {
  // Check if route has requiredRole defined (even if undefined value)
  return 'requiredRole' in route;
}

/**
 * Renders an array of route configurations into Route components
 *
 * @param routes - Array of route configurations
 * @param options - Rendering options
 * @returns Array of Route elements
 *
 * @example
 * ```tsx
 * <Routes>
 *   {renderRoutes(publicRoutes)}
 *   {renderRoutes(protectedRoutes, { requireAuth: true })}
 *   {renderRoutes(adminRoutes)}
 * </Routes>
 * ```
 */
export function renderRoutes(
  routes: RouteConfig[],
  options: {
    /** Apply auth requirement to all routes in this group */
    requireAuth?: boolean;
    /** Default showErrorDetails for all routes in this group */
    defaultShowErrorDetails?: boolean;
  } = {}
) {
  return routes.map((route) => {
    // Create modified route config with group-level defaults
    const modifiedRoute: RouteConfig = {
      ...route,
      showErrorDetails: route.showErrorDetails ?? options.defaultShowErrorDetails ?? false,
    };

    return (
      <Route
        key={route.path}
        path={route.path}
        element={<RouteElementWithAuth route={modifiedRoute} requireAuth={options.requireAuth} />}
      />
    );
  });
}

/**
 * RouteElement with optional auth wrapper
 */
function RouteElementWithAuth({
  route,
  requireAuth = false,
}: {
  route: RouteConfig;
  requireAuth?: boolean;
}) {
  const Component = route.component;
  const showDetails = route.showErrorDetails ?? false;
  const isLazy = route.isLazy ?? true;

  // Create the error boundary fallback based on showDetails
  const errorFallback = showDetails
    ? (error: Error, reset: () => void) => (
        <ErrorFallback error={error} resetError={reset} showDetails={true} />
      )
    : undefined;

  // Build the content
  let content = <Component />;

  // Wrap in Suspense if lazy loaded
  if (isLazy) {
    content = <Suspense fallback={<PageLoader />}>{content}</Suspense>;
  }

  // Wrap in ProtectedRoute if:
  // 1. Route has a specific role requirement
  // 2. Route group requires auth (requireAuth option)
  const needsAuth = route.requiredRole !== undefined || requireAuth;

  if (needsAuth) {
    content = (
      <ProtectedRoute requiredRole={route.requiredRole} blockAdminAccess={route.blockAdminAccess}>
        {content}
      </ProtectedRoute>
    );
  }

  // Always wrap in ErrorBoundary
  return (
    <ErrorBoundary fallback={errorFallback}>
      {content}
    </ErrorBoundary>
  );
}

export { RouteElement };

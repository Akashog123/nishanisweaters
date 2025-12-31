/**
 * Route Components and Utilities
 *
 * This module provides two approaches for route handling:
 *
 * ## 1. Configuration-Based Routes (Recommended)
 *
 * Use `renderRoutes` with route configurations from `@/config/routes`:
 *
 * ```tsx
 * import { publicRoutes, adminRoutes } from "@/config/routes";
 * import { renderRoutes } from "@/components/routes";
 *
 * <Routes>
 *   {renderRoutes(publicRoutes)}
 *   {renderRoutes(adminRoutes)}
 * </Routes>
 * ```
 *
 * ## 2. Component-Based Routes (Legacy)
 *
 * Individual route wrapper components for manual route definition:
 *
 * ```tsx
 * import { AdminRoute, WholesaleRoute, ProtectedUserRoute, PublicRoute } from "@/components/routes";
 *
 * <Route path="/admin/products" element={<AdminRoute component={AdminProducts} />} />
 * <Route path="/wholesale/dashboard" element={<WholesaleRoute component={WholesaleDashboard} />} />
 * <Route path="/checkout" element={<ProtectedUserRoute component={Checkout} />} />
 * <Route path="/" element={<PublicRoute><Index /></PublicRoute>} />
 * ```
 */

// Configuration-based route rendering (recommended)
export { renderRoutes, RouteElement } from "./RouteRenderer";

// Component-based route wrappers (legacy, still usable)
export { AdminRoute } from "./AdminRoute";
export { ProtectedUserRoute } from "./ProtectedUserRoute";
export { WholesaleRoute } from "./WholesaleRoute";
export { PublicRoute } from "./PublicRoute";
export { PageLoader } from "./PageLoader";

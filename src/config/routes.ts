/**
 * Route Configuration
 *
 * Centralized route definitions for the application.
 * This eliminates repetitive route patterns in App.tsx by defining
 * routes as configuration objects that can be rendered consistently.
 */

import { lazy, LazyExoticComponent, ComponentType } from 'react';

// User roles matching the ProtectedRoute requirements
export type UserRole = 'customer' | 'admin';

/**
 * Route configuration interface
 */
export interface RouteConfig {
  /** Route path (supports dynamic segments like :productId) */
  path: string;
  /** Lazy-loaded component for the route */
  component: LazyExoticComponent<ComponentType<unknown>>;
  /** Required role for protected routes (undefined = auth only, null = public) */
  requiredRole?: UserRole;
  /** Whether to show error details in the error boundary (default: false) */
  showErrorDetails?: boolean;
  /** Whether this is a lazy-loaded component requiring Suspense (default: true for lazy components) */
  isLazy?: boolean;
  /** Whether to block admin users from accessing this route (default: false) */
  blockAdminAccess?: boolean;
}

/**
 * Public routes - No authentication required
 * These routes are accessible to all users
 */
export const publicRoutes: RouteConfig[] = [
  {
    path: '/',
    component: lazy(() => import('@/pages/Index')),
    isLazy: false, // Index is eagerly loaded
  },
  {
    path: '/product/:productId',
    component: lazy(() => import('@/pages/ProductDetail')),
    isLazy: false, // ProductDetail is eagerly loaded
  },
  {
    path: '/shop/:category',
    component: lazy(() => import('@/pages/Shop')),
    isLazy: false, // Shop is eagerly loaded
  },
  {
    path: '/shop',
    component: lazy(() => import('@/pages/Shop')),
    isLazy: false, // Shop is eagerly loaded
  },
  {
    path: '/search',
    component: lazy(() => import('@/pages/SearchResults')),
    isLazy: false, // SearchResults is eagerly loaded
  },
  {
    path: '/contact-us',
    component: lazy(() => import('@/pages/ContactUs')),
    isLazy: true,
  },
  {
    path: '/about-us',
    component: lazy(() => import('@/pages/AboutUs')),
    isLazy: true,
  },
  {
    path: '/bulk-purchase',
    component: lazy(() => import('@/pages/wholesale/BulkOrder')),
    isLazy: true,
  },
];

/**
 * Cart routes - Cart is public, but checkout requires auth
 */
export const cartRoutes: RouteConfig[] = [
  {
    path: '/cart',
    component: lazy(() => import('@/pages/Cart')),
    isLazy: true,
  },
];

/**
 * Protected routes - Authentication required (any authenticated user)
 * These routes require the user to be signed in
 */
export const protectedRoutes: RouteConfig[] = [
  {
    path: '/checkout',
    component: lazy(() => import('@/pages/Checkout')),
    isLazy: true,
  },
  {
    path: '/order-confirmation/:orderId',
    component: lazy(() => import('@/pages/OrderConfirmation')),
    isLazy: true,
  },
  {
    path: '/orders',
    component: lazy(() => import('@/pages/OrderHistory')),
    isLazy: true,
  },
  {
    path: '/order-history',
    component: lazy(() => import('@/pages/OrderHistory')),
    isLazy: true,
  },
  {
    path: '/wishlist',
    component: lazy(() => import('@/pages/Wishlist')),
    isLazy: true,
  },
];


/**
 * Admin routes - Requires admin role
 * These routes show detailed errors for troubleshooting
 */
export const adminRoutes: RouteConfig[] = [
  {
    path: '/admin',
    component: lazy(() => import('@/pages/admin/AdminDashboard')),
    requiredRole: 'admin',
    showErrorDetails: true,
    isLazy: true,
  },
  {
    path: '/admin/products',
    component: lazy(() => import('@/pages/admin/AdminProducts')),
    requiredRole: 'admin',
    showErrorDetails: true,
    isLazy: true,
  },
  {
    path: '/admin/categories',
    component: lazy(() => import('@/pages/admin/AdminCategories')),
    requiredRole: 'admin',
    showErrorDetails: true,
    isLazy: true,
  },
  {
    path: '/admin/orders',
    component: lazy(() => import('@/pages/admin/AdminOrders')),
    requiredRole: 'admin',
    showErrorDetails: true,
    isLazy: true,
  },
  {
    path: '/admin/customers',
    component: lazy(() => import('@/pages/admin/AdminCustomers')),
    requiredRole: 'admin',
    showErrorDetails: true,
    isLazy: true,
  },
  {
    path: '/admin/reviews',
    component: lazy(() => import('@/pages/admin/AdminReviews')),
    requiredRole: 'admin',
    showErrorDetails: true,
    isLazy: true,
  },
  {
    path: '/admin/cms',
    component: lazy(() => import('@/pages/admin/AdminCMS')),
    requiredRole: 'admin',
    showErrorDetails: true,
    isLazy: true,
  },
  {
    path: '/admin/promo-codes',
    component: lazy(() => import('@/pages/admin/AdminPromoCodes')),
    requiredRole: 'admin',
    showErrorDetails: true,
    isLazy: true,
  },
  {
    path: '/admin/settings',
    component: lazy(() => import('@/pages/admin/AdminSettings')),
    requiredRole: 'admin',
    showErrorDetails: true,
    isLazy: true,
  },
];

/**
 * All routes combined for convenience
 */
export const allRoutes = [
  ...publicRoutes,
  ...cartRoutes,
  ...protectedRoutes,
  ...adminRoutes,
];

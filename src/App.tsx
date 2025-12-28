import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Shop from "./pages/Shop";
import SearchResults from "./pages/SearchResults";
import NotFound from "./pages/NotFound";
import { CartProvider } from "@/context/CartContext";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { useUserSync } from "@/components/auth/useUserSync";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import ErrorFallback from "@/components/ErrorFallback";
import { queryClient } from "@/lib/queryClient";

// Lazy load pages for better performance
import { lazy, Suspense } from "react";

const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const Account = lazy(() => import("./pages/Account"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const WholesaleRegistration = lazy(() => import("./pages/wholesale/WholesaleRegistration"));
const WholesaleDashboard = lazy(() => import("./pages/wholesale/WholesaleDashboard"));
const BulkOrder = lazy(() => import("./pages/wholesale/BulkOrder"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminWholesale = lazy(() => import("./pages/admin/AdminWholesale"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminCMS = lazy(() => import("./pages/admin/AdminCMS"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

// App content component to use hooks
function AppContent() {
  useSmoothScroll();
  useUserSync();

  return (
    <Routes>
      {/* Public Routes - Wrapped in ErrorBoundary */}
      <Route
        path="/"
        element={
          <ErrorBoundary>
            <Index />
          </ErrorBoundary>
        }
      />
      <Route
        path="/product/:productId"
        element={
          <ErrorBoundary>
            <ProductDetail />
          </ErrorBoundary>
        }
      />
      <Route
        path="/shop/:category"
        element={
          <ErrorBoundary>
            <Shop />
          </ErrorBoundary>
        }
      />
      <Route
        path="/shop"
        element={
          <ErrorBoundary>
            <Shop />
          </ErrorBoundary>
        }
      />
      <Route
        path="/search"
        element={
          <ErrorBoundary>
            <SearchResults />
          </ErrorBoundary>
        }
      />

      {/* Cart & Checkout - Wrapped in ErrorBoundary */}
      <Route
        path="/cart"
        element={
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Cart />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/checkout"
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Checkout />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/order-confirmation/:orderId"
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <OrderConfirmation />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />

      {/* User Account Routes - Wrapped in ErrorBoundary */}
      <Route
        path="/account"
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Account />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/orders"
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <OrderHistory />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/wishlist"
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Wishlist />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />

      {/* Wholesale Routes - Wrapped in ErrorBoundary */}
      <Route
        path="/wholesale/register"
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <WholesaleRegistration />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/wholesale/dashboard"
        element={
          <ErrorBoundary>
            <ProtectedRoute requiredRole="wholesale">
              <Suspense fallback={<PageLoader />}>
                <WholesaleDashboard />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/wholesale/bulk-order"
        element={
          <ErrorBoundary>
            <ProtectedRoute requiredRole="wholesale">
              <Suspense fallback={<PageLoader />}>
                <BulkOrder />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />

      {/* Admin Routes - Separate ErrorBoundary for isolation */}
      <Route
        path="/admin"
        element={
          <ErrorBoundary
            fallback={(error, reset) => (
              <ErrorFallback error={error} resetError={reset} showDetails={true} />
            )}
          >
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ErrorBoundary
            fallback={(error, reset) => (
              <ErrorFallback error={error} resetError={reset} showDetails={true} />
            )}
          >
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<PageLoader />}>
                <AdminProducts />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ErrorBoundary
            fallback={(error, reset) => (
              <ErrorFallback error={error} resetError={reset} showDetails={true} />
            )}
          >
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<PageLoader />}>
                <AdminOrders />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <ErrorBoundary
            fallback={(error, reset) => (
              <ErrorFallback error={error} resetError={reset} showDetails={true} />
            )}
          >
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<PageLoader />}>
                <AdminCustomers />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/admin/wholesale"
        element={
          <ErrorBoundary
            fallback={(error, reset) => (
              <ErrorFallback error={error} resetError={reset} showDetails={true} />
            )}
          >
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<PageLoader />}>
                <AdminWholesale />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/admin/reviews"
        element={
          <ErrorBoundary
            fallback={(error, reset) => (
              <ErrorFallback error={error} resetError={reset} showDetails={true} />
            )}
          >
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<PageLoader />}>
                <AdminReviews />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/admin/cms"
        element={
          <ErrorBoundary
            fallback={(error, reset) => (
              <ErrorFallback error={error} resetError={reset} showDetails={true} />
            )}
          >
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<PageLoader />}>
                <AdminCMS />
              </Suspense>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />

      {/* Catch-all 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

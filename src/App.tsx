import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { CartProvider } from "@/context/CartContext";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { useUserSync } from "@/components/auth/useUserSync";
import { useAuthObservability } from "@/hooks/useAuthObservability";
import { queryClient } from "@/lib/queryClient";

// Import route configurations
import {
  publicRoutes,
  cartRoutes,
  protectedRoutes,
  adminRoutes,
} from "@/config/routes";

// Import route renderer
import { renderRoutes } from "@/components/routes/RouteRenderer";

// App content component to use hooks
function AppContent() {
  useSmoothScroll();
  useUserSync();
  // OBSERVABILITY: Set user segment for performance tracking (retail/wholesale/anonymous)
  useAuthObservability();

  return (
    <Routes>
      {/* Public Routes - No authentication required */}
      {renderRoutes(publicRoutes)}

      {/* Cart Routes - Cart is public with lazy loading */}
      {renderRoutes(cartRoutes)}

      {/* Protected Routes - Requires authentication */}
      {renderRoutes(protectedRoutes, { requireAuth: true })}

      {/* Admin Routes - Requires admin role with detailed error display */}
      {renderRoutes(adminRoutes)}

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
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppContent />
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

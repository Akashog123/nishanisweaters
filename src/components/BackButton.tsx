import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  /** Custom fallback path if no history to go back to */
  fallback?: string;
  /** Show home button instead of back */
  showHome?: boolean;
  /** Custom className */
  className?: string;
  /** Custom text label */
  label?: string;
}

/**
 * BackButton - A reusable navigation component
 *
 * Features:
 * - Goes back in history if available
 * - Falls back to a custom path or home
 * - Shows appropriate icon based on context
 */
export function BackButton({
  fallback = "/",
  showHome = false,
  className = "",
  label,
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if there's history to go back to
  // We check if current path is not the same as fallback to determine if back is possible
  const hasHistory = location.key !== "default";

  const handleGoBack = () => {
    if (hasHistory) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={showHome ? () => navigate(fallback) : handleGoBack}
      className={`gap-2 ${className}`}
    >
      {showHome ? (
        <Home className="h-4 w-4" />
      ) : (
        <ArrowLeft className="h-4 w-4" />
      )}
      {label || (showHome ? "Home" : hasHistory ? "Back" : "Go Home")}
    </Button>
  );
}

/**
 * MobileBackButton - Larger touch-friendly version for mobile
 */
export function MobileBackButton({
  fallback = "/",
  className = "",
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasHistory = location.key !== "default";

  const handleGoBack = () => {
    if (hasHistory) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      onClick={handleGoBack}
      className={`flex items-center gap-2 p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="h-5 w-5" />
      <span className="text-sm font-medium">{hasHistory ? "Back" : "Home"}</span>
    </button>
  );
}

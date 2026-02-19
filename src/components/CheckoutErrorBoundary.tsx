/**
 * Checkout-Specific Error Boundary
 *
 * Provides specialized error handling for the checkout flow.
 * Unlike the generic ErrorBoundary, this one:
 * - Shows checkout-specific messaging about payment safety
 * - Links to order history to check if payment went through
 * - Provides clear recovery actions specific to checkout context
 */

import { Component, ReactNode, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { logError } from "@/lib/errors";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CheckoutErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with checkout-specific context
    logError(error, "CheckoutErrorBoundary");
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Checkout Error</h2>

          <p className="text-muted-foreground mb-6 max-w-md">
            Something went wrong during checkout.{" "}
            <strong>If you completed payment, your order may still be processing.</strong>{" "}
            Please check your email or order history before trying again to avoid duplicate charges.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button onClick={this.handleReset} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            <Link to="/order-history">
              <Button variant="outline">
                <ClipboardList className="h-4 w-4 mr-2" />
                Check Order History
              </Button>
            </Link>

            <Link to="/">
              <Button variant="ghost">
                <Home className="h-4 w-4 mr-2" />
                Return Home
              </Button>
            </Link>
          </div>

          {process.env.NODE_ENV === "development" && this.state.error && (
            <div className="mt-6 p-4 bg-muted rounded-lg text-left max-w-md w-full">
              <p className="text-sm font-mono text-destructive break-all">
                {this.state.error.toString()}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default CheckoutErrorBoundary;

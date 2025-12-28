import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAppError, getErrorMessage, ErrorCode } from '@/lib/errors';

interface ErrorFallbackProps {
  error: Error | unknown;
  resetError?: () => void;
  showDetails?: boolean;
}

export default function ErrorFallback({
  error,
  resetError,
  showDetails = false,
}: ErrorFallbackProps) {
  const errorMessage = getErrorMessage(error);
  const isAuthError =
    isAppError(error) &&
    (error.code === ErrorCode.UNAUTHORIZED ||
      error.code === ErrorCode.FORBIDDEN ||
      error.code === ErrorCode.SESSION_EXPIRED);
  const isNetworkError =
    isAppError(error) &&
    (error.code === ErrorCode.NETWORK_ERROR || error.code === ErrorCode.TIMEOUT);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            {isAuthError
              ? 'Authentication Required'
              : isNetworkError
              ? 'Connection Error'
              : 'Something Went Wrong'}
          </h2>
          <p className="text-muted-foreground">{errorMessage}</p>
        </div>

        {/* Error Details (Development Only) */}
        {showDetails && process.env.NODE_ENV === 'development' && error instanceof Error && (
          <div className="bg-muted p-4 rounded-lg text-left">
            <details>
              <summary className="font-medium cursor-pointer text-sm">
                Error Details
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs font-mono text-destructive">
                    {error.name}: {error.message}
                  </p>
                </div>
                {error.stack && (
                  <pre className="text-xs overflow-auto max-h-40 bg-background p-2 rounded">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {resetError && (
            <Button onClick={resetError} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}

          {isNetworkError && (
            <Button onClick={handleReload} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </Button>
          )}

          {isAuthError && (
            <Button
              onClick={() => (window.location.href = '/api/auth/signin')}
              className="gap-2"
            >
              Sign In
            </Button>
          )}

          <Button onClick={handleGoHome} variant="outline" className="gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>

        {/* Help Text */}
        {isNetworkError && (
          <p className="text-sm text-muted-foreground">
            Please check your internet connection and try again.
          </p>
        )}

        {isAuthError && (
          <p className="text-sm text-muted-foreground">
            You need to be signed in to access this page.
          </p>
        )}
      </div>
    </div>
  );
}

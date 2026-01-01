import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useConvexError } from '@/hooks/useConvexError';
import { isAppError, ErrorCode, UnauthorizedError } from '@/lib/errors';

interface AdminErrorHandlerProps {
  error: unknown;
  action?: string;
  onRetry?: () => void;
}

/**
 * Specialized error handler for admin pages
 * Shows appropriate error messages for permission denied, network errors, etc.
 */
export function AdminErrorHandler({
  error,
  action = 'perform this action',
  onRetry,
}: AdminErrorHandlerProps) {
  useConvexError();

  // Handle permission errors specially in admin context
  const isPermissionError =
    isAppError(error) &&
    (error.code === ErrorCode.UNAUTHORIZED || error.code === ErrorCode.FORBIDDEN);

  const isNetworkError =
    isAppError(error) &&
    (error.code === ErrorCode.NETWORK_ERROR || error.code === ErrorCode.TIMEOUT);

  if (isPermissionError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Permission Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to {action}. Please contact your administrator
          if you believe this is a mistake.
        </AlertDescription>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
          >
            Return to Dashboard
          </Button>
        </div>
      </Alert>
    );
  }

  if (isNetworkError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription>
          Unable to connect to the server. Please check your internet connection
          and try again.
        </AlertDescription>
        {onRetry && (
          <div className="mt-4">
            <Button onClick={onRetry}>Retry</Button>
          </div>
        )}
      </Alert>
    );
  }

  // Generic error
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred';

  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Failed to {action}: {errorMessage}
      </AlertDescription>
      {onRetry && (
        <div className="mt-4 flex gap-2">
          <Button onClick={onRetry}>Retry</Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </div>
      )}
    </Alert>
  );
}

/**
 * Wrapper for admin mutations with error handling
 */
export function useAdminMutation<T extends (...args: any[]) => Promise<any>>(
  mutation: T,
  options?: {
    onSuccess?: (result: Awaited<ReturnType<T>>) => void;
    onError?: (error: unknown) => void;
    successMessage?: string;
  }
) {
  const { handleError } = useConvexError();

  const wrappedMutation = async (...args: Parameters<T>) => {
    try {
      const result = await mutation(...args);
      if (options?.successMessage) {
        // Success toast is handled by useConvexError
      }
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    } catch (error) {
      // Check for permission errors
      if (
        isAppError(error) &&
        (error.code === ErrorCode.UNAUTHORIZED ||
          error.code === ErrorCode.FORBIDDEN)
      ) {
        throw new UnauthorizedError(
          'You do not have permission to perform this action'
        );
      }

      handleError(error, 'AdminMutation');

      if (options?.onError) {
        options.onError(error);
      }

      throw error;
    }
  };

  return wrappedMutation as T;
}

/**
 * Loading skeleton for admin pages
 */
export function AdminLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
      <div className="h-96 bg-muted animate-pulse rounded-lg" />
    </div>
  );
}

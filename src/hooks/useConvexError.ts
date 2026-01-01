import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  parseConvexError,
  getErrorMessage,
  ErrorCode,
  isAppError,
  logError,
  AppError,
} from '@/lib/errors';

interface UseConvexErrorOptions {
  showToast?: boolean;
  logErrors?: boolean;
  onError?: (error: AppError) => void;
}

interface UseConvexErrorReturn {
  handleError: (error: unknown, context?: string) => AppError;
  showErrorToast: (error: unknown) => void;
  isErrorType: (error: unknown, code: string) => boolean;
}

/**
 * Custom hook to handle Convex errors consistently
 * Maps error codes to user-friendly messages
 * Provides toast notifications for errors
 */
export function useConvexError(
  options: UseConvexErrorOptions = {}
): UseConvexErrorReturn {
  const {
    showToast = true,
    logErrors = true,
    onError,
  } = options;

  /**
   * Show error toast notification with appropriate styling
   * NOTE: Defined before handleError so it can be used as a dependency
   */
  const showErrorToast = useCallback((error: unknown): void => {
    const message = getErrorMessage(error);
    const parsedError = parseConvexError(error);

    // Different toast styles based on error type
    if (
      parsedError.code === ErrorCode.UNAUTHORIZED ||
      parsedError.code === ErrorCode.FORBIDDEN
    ) {
      toast.error(message, {
        description: 'Please sign in to continue',
        action: {
          label: 'Sign In',
          onClick: () => {
            window.location.href = '/api/auth/signin';
          },
        },
      });
      return;
    }

    if (parsedError.code === ErrorCode.NETWORK_ERROR) {
      toast.error(message, {
        description: 'Please check your internet connection',
        action: {
          label: 'Retry',
          onClick: () => window.location.reload(),
        },
      });
      return;
    }

    if (
      parsedError.code === ErrorCode.PRODUCT_NOT_FOUND ||
      parsedError.code === ErrorCode.ORDER_NOT_FOUND
    ) {
      toast.error(message, {
        action: {
          label: 'Go Home',
          onClick: () => {
            window.location.href = '/';
          },
        },
      });
      return;
    }

    if (parsedError.code === ErrorCode.PAYMENT_FAILED) {
      toast.error(message, {
        description: 'Please try again or use a different payment method',
      });
      return;
    }

    // Default error toast
    toast.error(message);
  }, []);

  /**
   * Handle and parse Convex errors
   */
  const handleError = useCallback(
    (error: unknown, context?: string): AppError => {
      const parsedError = parseConvexError(error);

      // Log error if enabled
      if (logErrors) {
        logError(parsedError, context);
      }

      // Show toast notification if enabled
      if (showToast) {
        showErrorToast(parsedError);
      }

      // Call custom error handler if provided
      if (onError) {
        onError(parsedError);
      }

      return parsedError;
    },
    [showToast, logErrors, onError, showErrorToast]
  );

  /**
   * Check if error is of a specific type
   */
  const isErrorType = useCallback((error: unknown, code: string): boolean => {
    if (isAppError(error)) {
      return error.code === code;
    }
    return false;
  }, []);

  return {
    handleError,
    showErrorToast,
    isErrorType,
  };
}

/**
 * Hook specifically for handling async operations with Convex
 */
export function useAsyncError() {
  const { handleError } = useConvexError();

  const wrapAsync = useCallback(
    <T>(
      asyncFn: () => Promise<T>,
      context?: string
    ): Promise<T | undefined> => {
      return asyncFn().catch((error) => {
        handleError(error, context);
        return undefined;
      });
    },
    [handleError]
  );

  return { wrapAsync };
}

/**
 * Hook for handling query errors
 */
export function useQueryError() {
  const { handleError, showErrorToast } = useConvexError({ showToast: false });

  const handleQueryError = useCallback(
    (error: unknown, context?: string) => {
      const parsedError = handleError(error, context);

      // Only show toast for non-auth errors in queries
      if (
        parsedError.code !== ErrorCode.UNAUTHORIZED &&
        parsedError.code !== ErrorCode.FORBIDDEN
      ) {
        showErrorToast(parsedError);
      }

      return parsedError;
    },
    [handleError, showErrorToast]
  );

  return { handleQueryError };
}

/**
 * Hook for handling mutation errors
 */
export function useMutationError() {
  const { handleError } = useConvexError({ showToast: true });

  const handleMutationError = useCallback(
    (error: unknown, context?: string, customMessage?: string) => {
      const parsedError = handleError(error, context);

      if (customMessage) {
        toast.error(customMessage);
      }

      return parsedError;
    },
    [handleError]
  );

  return { handleMutationError };
}

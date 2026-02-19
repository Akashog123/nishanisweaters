// Error code constants
export const ErrorCode = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_CANCELLED: 'PAYMENT_CANCELLED',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',

  // Cart errors
  CART_EMPTY: 'CART_EMPTY',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  OUT_OF_STOCK: 'OUT_OF_STOCK',

  // Unknown errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

// Error classes
export class AppError extends Error {
  code: ErrorCodeType;
  statusCode?: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.UNKNOWN_ERROR,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: Record<string, unknown>) {
    super(
      `${resource} not found`,
      ErrorCode.NOT_FOUND,
      404,
      details
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access', details?: Record<string, unknown>) {
    super(message, ErrorCode.UNAUTHORIZED, 401, details);
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
  }
}

export class PaymentError extends AppError {
  constructor(message: string = 'Payment processing failed', details?: Record<string, unknown>) {
    super(message, ErrorCode.PAYMENT_FAILED, 402, details);
    this.name = 'PaymentError';
  }
}

// Error message mapping
export const ERROR_MESSAGES: Record<ErrorCodeType, string> = {
  // Authentication
  UNAUTHORIZED: 'You need to be signed in to access this resource',
  FORBIDDEN: 'You do not have permission to access this resource',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again',

  // Resources
  NOT_FOUND: 'The requested resource was not found',
  PRODUCT_NOT_FOUND: 'This product could not be found',
  ORDER_NOT_FOUND: 'Order not found. Please check your order number',
  USER_NOT_FOUND: 'User account not found',

  // Payment
  PAYMENT_FAILED: 'Payment processing failed. Please try again',
  PAYMENT_CANCELLED: 'Payment was cancelled',
  INVALID_PAYMENT_METHOD: 'Invalid payment method selected',

  // Validation
  VALIDATION_ERROR: 'Please check your input and try again',
  INVALID_INPUT: 'Invalid input provided',
  MISSING_REQUIRED_FIELD: 'Please fill in all required fields',

  // Network
  NETWORK_ERROR: 'Network error. Please check your connection',
  TIMEOUT: 'Request timed out. Please try again',
  SERVER_ERROR: 'Server error. Please try again later',

  // Cart
  CART_EMPTY: 'Your cart is empty',
  INVALID_QUANTITY: 'Invalid quantity selected',
  OUT_OF_STOCK: 'This item is out of stock',

  // Unknown
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again',
};

// Type guards
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isPaymentError(error: unknown): error is PaymentError {
  return error instanceof PaymentError;
}

// Error parsing utilities
export function parseConvexError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for specific error patterns
    if (message.includes('not found')) {
      return new NotFoundError('Resource', { originalError: error });
    }

    if (message.includes('unauthorized') || message.includes('permission')) {
      return new UnauthorizedError(error.message, { originalError: error });
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return new ValidationError(error.message, { originalError: error });
    }

    if (message.includes('network') || message.includes('connection')) {
      return new AppError(
        error.message,
        ErrorCode.NETWORK_ERROR,
        undefined,
        { originalError: error }
      );
    }

    // Default case for Error objects
    return new AppError(error.message, ErrorCode.UNKNOWN_ERROR, undefined, {
      originalError: error,
    });
  }

  // Handle string errors
  if (typeof error === 'string') {
    return new AppError(error, ErrorCode.UNKNOWN_ERROR);
  }

  // Handle unknown error types
  return new AppError(
    'An unexpected error occurred',
    ErrorCode.UNKNOWN_ERROR,
    undefined,
    { originalError: error }
  );
}

// Get user-friendly error message
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return ERROR_MESSAGES[error.code] || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR];
}

// Error logging utility
export function logError(error: unknown, context?: string): void {
  const parsedError = parseConvexError(error);

  // Use the logger utility which handles dev/prod differently
  import('./logger').then(({ logger }) => {
    logger.error(
      parsedError.message,
      parsedError,
      {
        context,
        name: parsedError.name,
        code: parsedError.code,
        statusCode: parsedError.statusCode,
        details: parsedError.details,
      }
    );
  });
}

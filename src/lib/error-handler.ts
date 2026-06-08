// Centralized error handling utilities

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: "No internet connection. Please check your network.",
  SERVER_ERROR: "Server temporarily unavailable. Please try again later.",
  NOT_FOUND: "The requested resource was not found.",
  UNAUTHORIZED: "You don't have permission to perform this action.",
  VALIDATION_ERROR: "Please check your input and try again.",
  TIMEOUT: "Request timed out. Please try again.",
  UNKNOWN: "An unexpected error occurred. Please try again.",
};

export function handleApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    // Network error
    if (error.message === "Failed to fetch") {
      return {
        code: "NETWORK_ERROR",
        message: ERROR_MESSAGES.NETWORK_ERROR,
        statusCode: 0,
      };
    }

    // JSON parse error
    if (error instanceof SyntaxError) {
      return {
        code: "PARSE_ERROR",
        message: "Failed to parse server response.",
        statusCode: 0,
      };
    }

    // Generic error
    return {
      code: "UNKNOWN",
      message: error.message || ERROR_MESSAGES.UNKNOWN,
      statusCode: 0,
    };
  }

  return {
    code: "UNKNOWN",
    message: ERROR_MESSAGES.UNKNOWN,
    statusCode: 0,
  };
}

export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  fallbackValue?: T,
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    console.error("Async operation failed:", handleApiError(error));
    return fallbackValue;
  }
}

export function getErrorMessage(code: string, defaultMessage?: string): string {
  return ERROR_MESSAGES[code] || defaultMessage || ERROR_MESSAGES.UNKNOWN;
}

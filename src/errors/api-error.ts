export class ApiError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }

  public static validation(message: string, details?: unknown): ApiError {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  public static authentication(message = "Unauthorized"): ApiError {
    return new ApiError(401, "AUTHENTICATION_ERROR", message);
  }

  public static notFound(message = "Not found"): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  public static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  public static internal(message = "Internal server error", details?: unknown): ApiError {
    return new ApiError(500, "INTERNAL_SERVER_ERROR", message, details);
  }
}

export class ApiError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
    static validation(message, details) {
        return new ApiError(400, "VALIDATION_ERROR", message, details);
    }
    static authentication(message = "Unauthorized") {
        return new ApiError(401, "AUTHENTICATION_ERROR", message);
    }
    static notFound(message = "Not found") {
        return new ApiError(404, "NOT_FOUND", message);
    }
    static conflict(message) {
        return new ApiError(409, "CONFLICT", message);
    }
    static internal(message = "Internal server error", details) {
        return new ApiError(500, "INTERNAL_SERVER_ERROR", message, details);
    }
}

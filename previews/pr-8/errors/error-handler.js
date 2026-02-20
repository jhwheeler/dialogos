import { ApiError } from "./api-error.js";
import { AuthenticationError } from "./authentication-error.js";
import { ConflictError } from "./conflict-error.js";
import { NotFoundError } from "./not-found-error.js";
export function registerErrorHandler(app) {
    app.setErrorHandler((error, _request, reply) => {
        if (error instanceof ApiError) {
            return reply.status(error.statusCode).send({
                code: error.code,
                message: error.message,
                details: error.details,
            });
        }
        if (error instanceof NotFoundError) {
            return reply.status(404).send({
                code: "NOT_FOUND",
                message: error.message,
            });
        }
        if (error instanceof AuthenticationError) {
            return reply.status(401).send({
                code: "AUTHENTICATION_ERROR",
                message: error.message,
            });
        }
        if (error instanceof ConflictError) {
            return reply.status(409).send({
                code: "CONFLICT",
                message: error.message,
            });
        }
        app.log.error(error);
        return reply.status(500).send({
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
        });
    });
}

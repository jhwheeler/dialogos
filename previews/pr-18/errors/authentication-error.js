export class AuthenticationError extends Error {
    constructor(message = "Unauthorized") {
        super(message);
    }
}

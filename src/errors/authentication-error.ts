export class AuthenticationError extends Error {
  public constructor(message = "Unauthorized") {
    super(message);
  }
}

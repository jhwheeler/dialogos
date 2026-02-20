export class NotFoundError extends Error {
  public constructor(message = "Not found") {
    super(message);
  }
}

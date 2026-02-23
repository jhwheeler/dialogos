export interface StorageProvider {
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
    /** Exact byte size the upload must match (signed into the presigned URL). */
    contentLength?: number,
  ): Promise<string>;
  /** Fetch an object's raw bytes from storage. */
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
}

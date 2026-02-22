export interface StorageProvider {
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
    /** Exact byte size the upload must match (signed into the presigned URL). */
    contentLength?: number,
  ): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

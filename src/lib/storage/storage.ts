export interface StorageProvider {
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
  ): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

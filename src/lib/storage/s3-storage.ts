import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageProvider } from "./storage.js";

export interface S3StorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class S3Storage implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  public constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint && {
        endpoint: config.endpoint,
        forcePathStyle: true,
      }),
    });
  }

  public async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 3600,
    contentLength?: number,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      // ContentLength is signed into the presigned URL — S3 rejects uploads
      // that don't match this exact byte size.
      ...(contentLength !== undefined && { ContentLength: contentLength }),
    });

    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  public async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /** Max download size (50 MB) to prevent out-of-memory on unexpectedly large objects. */
  private static readonly MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;

  public async getObject(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`S3 object not found or empty: ${key}`);
    }
    const stream = response.Body as Readable;

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    for await (const chunk of stream) {
      totalBytes += (chunk as Uint8Array).length;
      if (totalBytes > S3Storage.MAX_DOWNLOAD_BYTES) {
        stream.destroy();
        throw new Error(
          `S3 object exceeds maximum download size (${S3Storage.MAX_DOWNLOAD_BYTES} bytes): ${key}`,
        );
      }
      chunks.push(Buffer.from(chunk as Uint8Array));
    }
    return Buffer.concat(chunks);
  }
}

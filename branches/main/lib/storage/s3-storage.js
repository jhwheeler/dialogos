import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
export class S3Storage {
    client;
    bucket;
    constructor(config) {
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
    async getPresignedUploadUrl(key, contentType, expiresInSeconds = 3600, contentLength) {
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
    async deleteObject(key) {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        await this.client.send(command);
    }
    /** Max download size (50 MB) to prevent out-of-memory on unexpectedly large objects. */
    static MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
    async getObject(key) {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        const response = await this.client.send(command);
        if (!response.Body) {
            throw new Error(`S3 object not found or empty: ${key}`);
        }
        const stream = response.Body;
        const chunks = [];
        let totalBytes = 0;
        for await (const chunk of stream) {
            totalBytes += chunk.length;
            if (totalBytes > S3Storage.MAX_DOWNLOAD_BYTES) {
                stream.destroy();
                throw new Error(`S3 object exceeds maximum download size (${S3Storage.MAX_DOWNLOAD_BYTES} bytes): ${key}`);
            }
            chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
}

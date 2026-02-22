import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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
}

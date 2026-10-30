import {
    DeleteObjectCommand,
    GetObjectCommand,
    NoSuchKey,
    NotFound,
    PutObjectCommand,
    S3Client,
    S3ServiceException,
} from '@aws-sdk/client-s3';
import { ulid } from 'ulidx';
import { Base } from './base.js';
import { Config } from './config.js';

const keyPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export type BinaryObject = {
    data: Uint8Array;
    contentType: string;
};

export class Binary extends Base {
    private readonly bucket: string;
    private readonly client: S3Client;

    constructor(config: Config) {
        super();
        const endpoint = config.require('S3_ENDPOINT');
        const bucket = config.require('S3_BUCKET');
        const accessKeyId = config.require('AWS_ACCESS_KEY_ID');
        const secretAccessKey = config.require('AWS_SECRET_ACCESS_KEY');

        this.bucket = bucket;
        this.client = new S3Client({
            endpoint,
            region: 'us-east-1',
            forcePathStyle: true,
            useDualstackEndpoint: false,
            requestChecksumCalculation: 'WHEN_REQUIRED',
            responseChecksumValidation: 'WHEN_REQUIRED',
            credentials: { accessKeyId, secretAccessKey },
        });
    }

    async store(data: Uint8Array, contentType = 'application/octet-stream'): Promise<string> {
        const id = ulid();
        const type = contentType.trim() || 'application/octet-stream';
        try {
            await this.client.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: id,
                Body: data.slice(),
                ContentType: type,
                ContentLength: data.byteLength,
            }));
        } catch (error) {
            throw failure(error, 'upload');
        }
        return id;
    }

    async load(id: string): Promise<BinaryObject | null> {
        assertKey(id);
        try {
            const response = await this.client.send(new GetObjectCommand({
                Bucket: this.bucket,
                Key: id,
            }));
            if (!response.Body) {
                throw new Error('S3 read returned an empty body');
            }

            const data = await response.Body.transformToByteArray();
            if (typeof response.ContentLength === 'number' && response.ContentLength !== data.byteLength) {
                throw new Error(`S3 read ${data.byteLength} bytes, expected ${response.ContentLength}`);
            }

            const type = response.ContentType;
            return {
                data,
                contentType: type && type.length > 0 ? type : 'application/octet-stream',
            };
        } catch (error) {
            if (isMissing(error)) {
                return null;
            }
            throw failure(error, 'read');
        }
    }

    async remove(id: string): Promise<void> {
        assertKey(id);
        try {
            await this.client.send(new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: id,
            }));
        } catch (error) {
            if (isMissing(error)) {
                return;
            }
            throw failure(error, 'delete');
        }
    }
}

function assertKey(id: string): void {
    if (!keyPattern.test(id)) {
        throw new Error(`Invalid binary id: ${id}`);
    }
}

function isMissing(error: unknown): boolean {
    if (error instanceof NoSuchKey || error instanceof NotFound) {
        return true;
    }
    return error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404;
}

function failure(error: unknown, action: string): Error {
    if (error instanceof Error && error.message.startsWith('S3 ')) {
        return error;
    }
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`S3 ${action} failed: ${message}`);
}

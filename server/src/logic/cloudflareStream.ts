import { createHmac, timingSafeEqual } from 'node:crypto';
import { Config } from '@sugarcube/server-core';
import { z } from 'zod';

const apiBase = 'https://api.cloudflare.com/client/v4';
const streamUidPattern = /^[0-9a-f]{32}$/;
const webhookSkewSeconds = 5 * 60;

const StreamCopyResponseSchema = z.object({
    success: z.boolean(),
    errors: z.array(z.object({
        message: z.string().optional(),
    })).optional(),
    result: z.object({
        uid: z.string(),
        readyToStream: z.boolean().optional(),
        status: z.object({
            state: z.string(),
        }).nullish(),
    }).optional(),
}).strip();

export type StreamCopyOutcome =
    | { ok: true; uid: string; readyToStream: boolean }
    | { ok: false; message: string };

export function streamEmbedUrl(uid: string): string {
    return `https://iframe.cloudflarestream.com/${uid}`;
}

export function isStreamUid(uid: string): boolean {
    return streamUidPattern.test(uid);
}

export class CloudflareStream {
    private readonly accountId: string;
    private readonly apiToken: string;
    private readonly webhookSecret: string;

    constructor(config: Config) {
        this.accountId = config.optional('CLOUDFLARE_ACCOUNT_ID', '');
        this.apiToken = config.optional('CLOUDFLARE_API_TOKEN', '');
        this.webhookSecret = config.optional('CLOUDFLARE_STREAM_WEBHOOK_SECRET', '');
    }

    configured(): boolean {
        return this.accountId.length > 0 && this.apiToken.length > 0;
    }

    requiresWebhookSignature(): boolean {
        return this.webhookSecret.length > 0;
    }

    verifyWebhook(rawBody: Buffer, header: string | undefined): boolean {
        return verifyStreamWebhookSignature(this.webhookSecret, rawBody, header);
    }

    async copyVideo(sourceUrl: string, userMediaId: string): Promise<StreamCopyOutcome> {
        if (!this.configured()) {
            return { ok: false, message: 'Cloudflare Stream is not configured.' };
        }

        const endpoint = `${apiBase}/accounts/${encodeURIComponent(this.accountId)}/stream/copy`;
        let response: Response;
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: sourceUrl,
                    meta: { user_media_id: userMediaId },
                    requireSignedURLs: false,
                }),
                signal: AbortSignal.timeout(30_000),
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { ok: false, message: redactUrl(message) };
        }

        const payload: unknown = await response.json().catch(() => null);
        const parsed = StreamCopyResponseSchema.safeParse(payload);
        if (!response.ok || !parsed.success || !parsed.data.success || !parsed.data.result) {
            return { ok: false, message: redactUrl(cloudflareError(payload) ?? `HTTP ${response.status}`) };
        }

        const uid = parsed.data.result.uid.toLowerCase();
        if (!isStreamUid(uid)) {
            return { ok: false, message: 'Cloudflare Stream returned an unexpected video id.' };
        }

        const readyToStream = parsed.data.result.readyToStream === true
            || parsed.data.result.status?.state === 'ready';
        return { ok: true, uid, readyToStream };
    }
}

export function verifyStreamWebhookSignature(
    secret: string,
    rawBody: Buffer,
    header: string | undefined,
    nowMs = Date.now(),
): boolean {
    if (!secret || !header) {
        return false;
    }

    const fields = new Map<string, string>();
    for (const part of header.split(',')) {
        const splitAt = part.indexOf('=');
        if (splitAt <= 0) {
            continue;
        }
        fields.set(part.slice(0, splitAt).trim(), part.slice(splitAt + 1).trim());
    }

    const time = fields.get('time');
    if (!time || !/^\d{1,20}$/.test(time)) {
        return false;
    }

    const sentAt = Number(time);
    const nowSeconds = Math.floor(nowMs / 1000);
    if (!Number.isSafeInteger(sentAt) || Math.abs(nowSeconds - sentAt) > webhookSkewSeconds) {
        return false;
    }

    const hmac = createHmac('sha256', secret);
    hmac.update(time);
    hmac.update('.');
    hmac.update(rawBody);
    const expected = Buffer.from(hmac.digest('hex'));

    let matched = false;
    for (const [key, value] of fields) {
        if (!key.startsWith('sig') || !/^[0-9a-f]+$/i.test(value)) {
            continue;
        }
        const received = Buffer.from(value.toLowerCase());
        if (received.length !== expected.length) {
            timingSafeEqual(expected, expected);
            continue;
        }
        if (timingSafeEqual(received, expected)) {
            matched = true;
        }
    }
    return matched;
}

function redactUrl(message: string): string {
    return message.replace(/https?:\/\/\S+/g, '[url]');
}

function cloudflareError(payload: unknown): string | null {
    if (typeof payload !== 'object' || payload === null || !('errors' in payload)) {
        return null;
    }
    const errors = payload.errors;
    if (!Array.isArray(errors)) {
        return null;
    }
    const messages = errors.flatMap((item) => {
        if (typeof item === 'object' && item !== null && 'message' in item && typeof item.message === 'string' && item.message.length > 0) {
            return [item.message];
        }
        return [];
    });
    return messages.length > 0 ? messages.join('; ') : null;
}

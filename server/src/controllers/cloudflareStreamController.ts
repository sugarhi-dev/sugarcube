import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { CloudflareStream, isStreamUid } from '../logic/cloudflareStream.js';
import { UserMediaLogic } from '../logic/userMediaLogic.js';
import { parseBody } from './httpHelpers.js';

export const cloudflareStreamCallbackPath = '/api/cloudflare/stream';

const CloudflareStreamCallbackSchema = z.object({
    uid: z.string().trim().min(1).max(32).optional(),
    readyToStream: z.boolean().optional(),
    status: z.object({
        state: z.string(),
        errorReasonCode: z.string().optional(),
        errorReasonText: z.string().optional(),
    }).nullish(),
    meta: z.object({
        user_media_id: z.string().optional(),
    }).nullish(),
}).strip();

type RequestWithRawBody = Request & { rawBody?: unknown };

export class CloudflareStreamController extends Controller {
    private readonly userMediaLogic: UserMediaLogic;
    private readonly cloudflareStream: CloudflareStream;

    constructor(app: Express, userMediaLogic: UserMediaLogic, cloudflareStream: CloudflareStream) {
        super(app);
        this.userMediaLogic = userMediaLogic;
        this.cloudflareStream = cloudflareStream;
        this.post(cloudflareStreamCallbackPath, this.POST_stream.bind(this));
    }

    protected async POST_stream(ctx: Context, req: Request, res: Response): Promise<void> {
        if (this.cloudflareStream.requiresWebhookSignature()) {
            const rawBody = streamWebhookRawBody(req);
            const signature = req.header('webhook-signature');
            if (!rawBody || !this.cloudflareStream.verifyWebhook(rawBody, signature)) {
                ctx.error('Webhook signature is not valid.', 401);
                this.checkAndRespond(ctx, res);
                return;
            }
        } else {
            this.log.error(`${ctx.traceId} CLOUDFLARE_STREAM_WEBHOOK_SECRET is not set`);
        }

        const body = parseBody(CloudflareStreamCallbackSchema, req.body);
        const state = body.status?.state ?? 'none';
        const mediaId = body.meta?.user_media_id ?? 'none';
        this.log.info(`${ctx.traceId} cloudflare stream callback uid=${body.uid ?? 'unknown'} state=${state} ready=${body.readyToStream === true} media=${mediaId}`);
        if (body.status?.state === 'error') {
            const reason = body.status.errorReasonText || body.status.errorReasonCode || 'unknown';
            this.log.error(`${ctx.traceId} cloudflare stream error ${body.uid ?? 'unknown'}: ${reason}`);
            res.status(200).json({ status: 'ignored' });
            return;
        }

        const ready = body.readyToStream === true || body.status?.state === 'ready';
        if (!ready) {
            this.log.info(`${ctx.traceId} cloudflare stream callback ignored ${body.uid ?? 'unknown'}`);
            res.status(200).json({ status: 'ignored' });
            return;
        }

        const uid = body.uid?.toLowerCase();
        if (!uid || !isStreamUid(uid)) {
            ctx.error('Stream callback is missing the video id.', 400);
            this.checkAndRespond(ctx, res);
            return;
        }

        const parsedMediaId = z.ulid().safeParse(body.meta?.user_media_id);
        const media = await this.userMediaLogic.markStreamReadyByUid(ctx, uid, parsedMediaId.success ? parsedMediaId.data : null);
        if (!media) {
            this.checkAndRespond(ctx, res);
            return;
        }
        this.log.info(`${ctx.traceId} cloudflare stream callback ready ${uid} ${media.id}`);
        res.status(200).json({ status: 'ready' });
    }
}

function streamWebhookRawBody(req: Request): Buffer | null {
    const raw = (req as RequestWithRawBody).rawBody;
    return Buffer.isBuffer(raw) ? raw : null;
}

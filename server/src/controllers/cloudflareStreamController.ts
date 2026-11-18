import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { UserMediaLogic } from '../logic/userMediaLogic.js';
import { parseBody } from './httpHelpers.js';

export const cloudflareStreamCallbackPath = '/api/cloudflare/stream';

const CloudflareStreamCallbackSchema = z.object({
    readyToStream: z.boolean().optional(),
    status: z.object({
        state: z.string(),
    }).nullish(),
    meta: z.object({
        user_media_id: z.string().optional(),
    }).nullish(),
    playback: z.object({
        hls: z.string().optional(),
    }).nullish(),
    preview: z.string().nullish(),
}).strip();

export class CloudflareStreamController extends Controller {
    private readonly userMediaLogic: UserMediaLogic;

    constructor(app: Express, userMediaLogic: UserMediaLogic) {
        super(app);
        this.userMediaLogic = userMediaLogic;
        this.post(cloudflareStreamCallbackPath, this.POST_stream.bind(this));
    }

    protected async POST_stream(ctx: Context, req: Request, res: Response): Promise<void> {
        const body = parseBody(CloudflareStreamCallbackSchema, req.body);
        if (body.status?.state !== 'ready') {
            res.status(200).json({ status: 'ignored' });
            return;
        }

        const id = z.ulid().safeParse(body.meta?.user_media_id);
        const streamUrl = body.playback?.hls ?? body.preview ?? null;
        if (!id.success || !streamUrl) {
            ctx.error('Stream callback is missing the media id or stream URL.', 400);
            this.checkAndRespond(ctx, res);
            return;
        }

        const media = await this.userMediaLogic.markStreamReady(ctx, id.data, streamUrl);
        if (!media) {
            this.checkAndRespond(ctx, res);
            return;
        }
        res.status(200).json({ status: 'ready' });
    }
}

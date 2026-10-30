import { Controller, type Context } from '@sugarcube/server-core';
import express, { type Express, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import { UserMediaLogic } from '../logic/userMediaLogic.js';
import { UserLogic } from '../logic/userLogic.js';
import { currentUser } from './currentUser.js';
import { parseBody } from './httpHelpers.js';

const UserMediaIdSchema = z.ulid().meta({ description: 'User media id.' });

const CreateUserMediaRequestSchema = z.object({
    url: z.string().trim().min(1).max(2048).meta({ description: 'YouTube or Vimeo link.' }),
});

const ReorderUserMediaRequestSchema = z.object({
    ids: z.array(z.ulid()).meta({ description: 'Media ids in display order.' }),
});

const UpdateUserMediaRequestSchema = z.object({
    url: z.string().trim().min(1).max(2048).meta({ description: 'Replacement YouTube or Vimeo link.' }),
});

const thumbnailLimit = 8 * 1024 * 1024;

const readThumbnailBody: RequestHandler = (req, res, next) => {
    express.raw({
        limit: thumbnailLimit,
        type: ['image/jpeg', 'image/png'],
    })(req, res, (error: unknown) => {
        if (!error) {
            next();
            return;
        }
        if (payloadTooLarge(error)) {
            res.status(413).json({ error_message: 'Use a thumbnail smaller than 8 MB.' });
            return;
        }
        next(error);
    });
};

export const userMediaRequestSchemas = {
    UserMediaId: UserMediaIdSchema,
    CreateUserMediaRequest: CreateUserMediaRequestSchema,
    ReorderUserMediaRequest: ReorderUserMediaRequestSchema,
    UpdateUserMediaRequest: UpdateUserMediaRequestSchema,
};

export class UserMediaController extends Controller {
    private readonly userLogic: UserLogic;
    private readonly userMediaLogic: UserMediaLogic;

    constructor(app: Express, userLogic: UserLogic, userMediaLogic: UserMediaLogic) {
        super(app);
        this.userLogic = userLogic;
        this.userMediaLogic = userMediaLogic;
        this.get('/api/me/media', this.GET_media.bind(this));
        this.post('/api/me/media', this.POST_media.bind(this));
        this.put('/api/me/media/order', this.PUT_media_order.bind(this));
        this.get('/api/me/media/:id/thumbnail', this.GET_media_thumbnail.bind(this));
        this.put('/api/me/media/:id/thumbnail', this.PUT_media_thumbnail.bind(this), [], [readThumbnailBody]);
        this.patch('/api/me/media/:id', this.PATCH_media.bind(this));
        this.delete('/api/me/media/:id', this.DELETE_media.bind(this));
    }

    protected async GET_media(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const media = await this.userMediaLogic.listUserMedia(ctx, user.id);
        this.checkAndRespond(ctx, res, media);
    }

    protected async POST_media(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const body = parseBody(CreateUserMediaRequestSchema, req.body);
        const media = await this.userMediaLogic.createUserMedia(ctx, user.id, body.url);
        this.checkAndRespond(ctx, res, media, 201);
    }

    protected async PUT_media_order(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const body = parseBody(ReorderUserMediaRequestSchema, req.body);
        const media = await this.userMediaLogic.reorderUserMedia(ctx, user.id, body.ids);
        this.checkAndRespond(ctx, res, media);
    }

    protected async GET_media_thumbnail(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = UserMediaIdSchema.parse(req.params.id);
        const thumbnail = await this.userMediaLogic.loadThumbnail(ctx, user.id, id);
        if (!thumbnail) {
            this.checkAndRespond(ctx, res);
            return;
        }

        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.status(200).type(thumbnail.contentType).send(Buffer.from(thumbnail.data));
    }

    protected async PUT_media_thumbnail(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = UserMediaIdSchema.parse(req.params.id);
        const contentType = thumbnailContentType(req.header('content-type'));
        const body = req.body;
        if (!contentType || !Buffer.isBuffer(body) || !isImage(body, contentType)) {
            ctx.error('Use a JPG or PNG thumbnail.', 400);
            this.checkAndRespond(ctx, res);
            return;
        }

        const media = await this.userMediaLogic.saveThumbnail(ctx, user.id, id, body, contentType);
        this.checkAndRespond(ctx, res, media);
    }

    protected async PATCH_media(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = UserMediaIdSchema.parse(req.params.id);
        const body = parseBody(UpdateUserMediaRequestSchema, req.body);
        const media = await this.userMediaLogic.updateUserMedia(ctx, user.id, id, body.url);
        this.checkAndRespond(ctx, res, media);
    }

    protected async DELETE_media(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = UserMediaIdSchema.parse(req.params.id);
        const media = await this.userMediaLogic.deleteUserMedia(ctx, user.id, id);
        this.checkAndRespond(ctx, res, media);
    }
}

function thumbnailContentType(header: string | undefined): 'image/jpeg' | 'image/png' | null {
    const type = header?.split(';', 1)[0]?.trim().toLowerCase();
    if (type === 'image/jpeg' || type === 'image/png') {
        return type;
    }
    return null;
}

function isImage(data: Buffer, contentType: 'image/jpeg' | 'image/png'): boolean {
    if (data.byteLength === 0 || data.byteLength > thumbnailLimit) {
        return false;
    }
    if (contentType === 'image/png') {
        return data.byteLength >= 8
            && data[0] === 0x89
            && data[1] === 0x50
            && data[2] === 0x4e
            && data[3] === 0x47
            && data[4] === 0x0d
            && data[5] === 0x0a
            && data[6] === 0x1a
            && data[7] === 0x0a;
    }
    return data.byteLength >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}

function payloadTooLarge(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    if ('type' in error && error.type === 'entity.too.large') {
        return true;
    }
    return 'status' in error && error.status === 413;
}

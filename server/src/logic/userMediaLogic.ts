import { classifyMediaLink } from '@sugarcube/schema';
import { Binary, Context, Logic, type BinaryObject } from '@sugarcube/server-core';
import { ulid } from 'ulidx';
import { UserMediaSchema, type UserMedia } from '../entities/userMedia.js';
import { UserMediaRepo } from '../repositories/userMediaRepo.js';
import { constraintFailure } from './pgError.js';

const ulidPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/;

const mediaConstraints = {
    user_media_user_profile_id_fkey: { statusCode: 404, message: 'Profile not found.' },
    user_media_media_type_check: { statusCode: 400, message: 'Media type is not allowed.' },
    user_media_sort_order_check: { statusCode: 400, message: 'Media order is not allowed.' },
    user_media_thumbnail_check: { statusCode: 400, message: 'Thumbnail is not valid.' },
};

export class UserMediaLogic extends Logic {
    private readonly userMediaRepo: UserMediaRepo;
    private readonly binary: Binary;

    constructor(userMediaRepo: UserMediaRepo, binary: Binary) {
        super();
        this.userMediaRepo = userMediaRepo;
        this.binary = binary;
    }

    listUserMedia(ctx: Context, userProfileId: string): Promise<UserMedia[]> {
        return this.userMediaRepo.listUserMedia(ctx, userProfileId);
    }

    async createUserMedia(ctx: Context, userProfileId: string, url: string): Promise<UserMedia | null> {
        const link = classifyMediaLink(url);
        if (!link) {
            ctx.error('Paste a YouTube or Vimeo link.', 400);
            return null;
        }

        const media = UserMediaSchema.omit({ sort_order: true }).parse({
            id: ulid(),
            user_profile_id: userProfileId,
            media_type: link.media_type,
            ref: link.url,
            thumbnail: null,
        });
        try {
            return await this.userMediaRepo.createUserMedia(ctx, media);
        } catch (error) {
            return this.rejectConstraint(ctx, error);
        }
    }

    async createUploadedMedia(
        ctx: Context,
        userProfileId: string,
        data: Uint8Array,
        contentType: string,
    ): Promise<UserMedia | null> {
        const ref = await this.storeBinary(ctx, data, contentType, 'video');
        if (!ref) {
            return null;
        }

        const media = UserMediaSchema.omit({ sort_order: true }).parse({
            id: ulid(),
            user_profile_id: userProfileId,
            media_type: 'upload',
            ref,
            thumbnail: null,
        });
        try {
            return await this.userMediaRepo.createUserMedia(ctx, media);
        } catch (error) {
            await this.discardBinary(ref);
            return this.rejectConstraint(ctx, error);
        }
    }

    async reorderUserMedia(ctx: Context, userProfileId: string, ids: string[]): Promise<UserMedia[] | null> {
        try {
            const media = await this.userMediaRepo.reorderUserMedia(ctx, userProfileId, ids);
            if (!media) {
                ctx.error('Media order does not match your videos.', 400);
                return null;
            }
            return media;
        } catch (error) {
            return this.rejectConstraint(ctx, error);
        }
    }

    async updateUserMedia(ctx: Context, userProfileId: string, id: string, url: string): Promise<UserMedia | null> {
        const link = classifyMediaLink(url);
        if (!link) {
            ctx.error('Paste a YouTube or Vimeo link.', 400);
            return null;
        }

        const current = await this.userMediaRepo.findUserMedia(ctx, userProfileId, id);
        if (!current) {
            ctx.error('Video not found.', 404);
            return null;
        }

        const previousVideo = storedUpload(current);
        const media = UserMediaSchema.parse({
            ...current,
            media_type: link.media_type,
            ref: link.url,
        });
        try {
            const updated = await this.userMediaRepo.updateUserMedia(ctx, media);
            if (!updated) {
                ctx.error('Video not found.', 404);
                return null;
            }
            if (previousVideo) {
                await this.discardBinary(previousVideo);
            }
            return updated;
        } catch (error) {
            return this.rejectConstraint(ctx, error);
        }
    }

    async saveThumbnail(
        ctx: Context,
        userProfileId: string,
        id: string,
        data: Uint8Array,
        contentType: string,
    ): Promise<UserMedia | null> {
        const current = await this.userMediaRepo.findUserMedia(ctx, userProfileId, id);
        if (!current) {
            ctx.error('Video not found.', 404);
            return null;
        }

        const thumbnail = await this.storeBinary(ctx, data, contentType, 'thumbnail');
        if (!thumbnail) {
            return null;
        }

        const media = UserMediaSchema.parse({
            ...current,
            thumbnail,
        });
        try {
            const updated = await this.userMediaRepo.updateUserMedia(ctx, media);
            if (!updated) {
                await this.discardBinary(thumbnail);
                ctx.error('Video not found.', 404);
                return null;
            }
            if (current.thumbnail && current.thumbnail !== thumbnail) {
                await this.discardBinary(current.thumbnail);
            }
            return updated;
        } catch (error) {
            await this.discardBinary(thumbnail);
            return this.rejectConstraint(ctx, error);
        }
    }

    async deleteUserMedia(ctx: Context, userProfileId: string, id: string): Promise<UserMedia | null> {
        const deleted = await this.userMediaRepo.deleteUserMedia(ctx, userProfileId, id);
        if (!deleted) {
            ctx.error('Video not found.', 404);
            return null;
        }
        if (deleted.thumbnail) {
            await this.discardBinary(deleted.thumbnail);
        }
        const video = storedUpload(deleted);
        if (video) {
            await this.discardBinary(video);
        }
        return deleted;
    }

    async loadThumbnail(ctx: Context, userProfileId: string, id: string): Promise<BinaryObject | null> {
        const media = await this.userMediaRepo.findUserMedia(ctx, userProfileId, id);
        if (!media?.thumbnail) {
            ctx.error('Thumbnail not found.', 404);
            return null;
        }

        this.log.trace(`${ctx.traceId} load media thumbnail ${media.thumbnail}`);
        const image = await this.binary.load(media.thumbnail);
        if (!image) {
            ctx.error('Thumbnail not found.', 404);
            return null;
        }
        return image;
    }

    private async storeBinary(ctx: Context, data: Uint8Array, contentType: string, kind: 'video' | 'thumbnail'): Promise<string | null> {
        try {
            return await this.binary.store(data, contentType);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.log.error(`${ctx.traceId} ${kind} store failed: ${message}`);
            ctx.error(kind === 'video' ? 'Could not store that video.' : 'Could not store that thumbnail.', 502);
            return null;
        }
    }

    private async discardBinary(id: string): Promise<void> {
        try {
            await this.binary.remove(id);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.log.error(`Could not remove binary ${id}: ${message}`);
        }
    }

    private rejectConstraint(ctx: Context, error: unknown): null {
        const failure = constraintFailure(error, mediaConstraints);
        if (!failure) {
            throw error;
        }
        ctx.error(failure.message, failure.statusCode);
        return null;
    }
}

function storedUpload(media: UserMedia): string | null {
    if (media.media_type !== 'upload' || !ulidPattern.test(media.ref)) {
        return null;
    }
    return media.ref;
}

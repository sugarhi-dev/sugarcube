import { Database, Repository, type Context } from '@sugarcube/server-core';
import { UserMediaSchema, type UserMedia } from '../entities/userMedia.js';
import { viewingProfile } from './viewingProfile.js';

type UserMediaRow = {
    id: string;
    user_account_id: string;
    media_type: UserMedia['media_type'];
    ref: string;
    thumbnail: string | null;
    sort_order: number;
    status: UserMedia['status'];
    stream_url: string | null;
    stream_uid: string | null;
};

const mediaColumns = 'id, user_account_id, media_type, ref, thumbnail, sort_order, status, stream_url, stream_uid';

export class UserMediaRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listUserMedia(ctx: Context, userAccountId: string): Promise<UserMedia[]> {
        this.log.trace(`${ctx.traceId} select user_media ${userAccountId}`);
        const result = await this.database.query<UserMediaRow>(
            `SELECT ${mediaColumns}
             FROM user_media
             WHERE user_account_id = $1 AND ${viewingProfile('$1')}
             ORDER BY sort_order, created_at`,
            [userAccountId],
        );
        return result.rows.map((row) => UserMediaSchema.parse(row));
    }

    async findUserMedia(ctx: Context, userAccountId: string, id: string): Promise<UserMedia | null> {
        this.log.trace(`${ctx.traceId} select user_media ${id}`);
        const result = await this.database.query<UserMediaRow>(
            `SELECT ${mediaColumns}
             FROM user_media
             WHERE id = $1 AND user_account_id = $2 AND ${viewingProfile('$2')}`,
            [id, userAccountId],
        );
        const row = result.rows[0];
        return row ? UserMediaSchema.parse(row) : null;
    }

    async createUserMedia(ctx: Context, media: Omit<UserMedia, 'sort_order'>): Promise<UserMedia> {
        this.log.trace(`${ctx.traceId} insert user_media ${media.id}`);
        return this.database.transaction(async (query) => {
            await lockAccount(query, media.user_account_id);
            const next = await query<{ sort_order: number }>(
                `SELECT COALESCE(MAX(sort_order), -1) + 1 AS sort_order
                 FROM user_media
                 WHERE user_account_id = $1 AND ${viewingProfile('$1')}`,
                [media.user_account_id],
            );
            const sortOrder = Number(next.rows[0]?.sort_order ?? 0);
            const result = await query<UserMediaRow>(
                `INSERT INTO user_media (
                     id, user_account_id, media_type, ref, thumbnail, sort_order, status, user_work_profile_id
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, (SELECT viewing_work_profile_id FROM user_account WHERE id = $2::varchar))
                 RETURNING ${mediaColumns}`,
                [media.id, media.user_account_id, media.media_type, media.ref, media.thumbnail, sortOrder, media.status],
            );
            return requiredRow(result.rows[0], `insert user_media ${media.id}`);
        });
    }

    async reorderUserMedia(ctx: Context, userAccountId: string, ids: string[]): Promise<UserMedia[] | null> {
        this.log.trace(`${ctx.traceId} reorder user_media ${userAccountId}`);
        return this.database.transaction(async (query) => {
            await lockAccount(query, userAccountId);
            const existing = await query<{ id: string }>(
                `SELECT id
                 FROM user_media
                 WHERE user_account_id = $1 AND ${viewingProfile('$1')}
                 ORDER BY sort_order, created_at`,
                [userAccountId],
            );
            const currentIds = existing.rows.map((row) => row.id);
            const current = new Set(currentIds);
            const requested = new Set(ids);
            if (requested.size !== ids.length || ids.some((id) => !current.has(id))) {
                return null;
            }
            const order = [...ids, ...currentIds.filter((id) => !requested.has(id))];

            for (let sortOrder = 0; sortOrder < order.length; sortOrder += 1) {
                await query(
                    `UPDATE user_media
                     SET sort_order = $3,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1 AND user_account_id = $2`,
                    [order[sortOrder], userAccountId, sortOrder],
                );
            }

            const listed = await query<UserMediaRow>(
                `SELECT ${mediaColumns}
                 FROM user_media
                 WHERE user_account_id = $1 AND ${viewingProfile('$1')}
                 ORDER BY sort_order, created_at`,
                [userAccountId],
            );
            return listed.rows.map((row) => UserMediaSchema.parse(row));
        });
    }

    async updateUserMedia(ctx: Context, media: UserMedia): Promise<UserMedia | null> {
        this.log.trace(`${ctx.traceId} update user_media ${media.id}`);
        const result = await this.database.query<UserMediaRow>(
            `UPDATE user_media
             SET media_type = $3,
                 ref = $4,
                 thumbnail = $5,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_account_id = $2 AND ${viewingProfile('$2')}
             RETURNING ${mediaColumns}`,
            [media.id, media.user_account_id, media.media_type, media.ref, media.thumbnail],
        );
        const row = result.rows[0];
        return row ? UserMediaSchema.parse(row) : null;
    }

    async deleteUserMedia(ctx: Context, userAccountId: string, id: string): Promise<UserMedia | null> {
        this.log.trace(`${ctx.traceId} delete user_media ${id}`);
        const result = await this.database.query<UserMediaRow>(
            `DELETE FROM user_media
             WHERE id = $1 AND user_account_id = $2 AND ${viewingProfile('$2')}
             RETURNING ${mediaColumns}`,
            [id, userAccountId],
        );
        const row = result.rows[0];
        return row ? UserMediaSchema.parse(row) : null;
    }

    async listUploadsAwaitingStream(ctx: Context): Promise<UserMedia[]> {
        this.log.trace(`${ctx.traceId} select user_media awaiting stream`);
        const result = await this.database.query<UserMediaRow>(
            `SELECT ${mediaColumns}
             FROM user_media
             WHERE media_type = 'upload'
               AND status IS DISTINCT FROM 'ready'
               AND stream_uid IS NULL
             ORDER BY created_at`,
        );
        return result.rows.map((row) => UserMediaSchema.parse(row));
    }

    async findByStreamUid(ctx: Context, streamUid: string): Promise<UserMedia | null> {
        this.log.trace(`${ctx.traceId} select user_media stream ${streamUid}`);
        const result = await this.database.query<UserMediaRow>(
            `SELECT ${mediaColumns}
             FROM user_media
             WHERE stream_uid = $1`,
            [streamUid],
        );
        const row = result.rows[0];
        return row ? UserMediaSchema.parse(row) : null;
    }

    async findMediaById(ctx: Context, id: string): Promise<UserMedia | null> {
        this.log.trace(`${ctx.traceId} select user_media ${id}`);
        const result = await this.database.query<UserMediaRow>(
            `SELECT ${mediaColumns}
             FROM user_media
             WHERE id = $1`,
            [id],
        );
        const row = result.rows[0];
        return row ? UserMediaSchema.parse(row) : null;
    }

    async attachStreamUid(ctx: Context, id: string, streamUid: string): Promise<UserMedia | null> {
        this.log.trace(`${ctx.traceId} link user_media ${id} ${streamUid}`);
        const result = await this.database.query<UserMediaRow>(
            `UPDATE user_media
             SET stream_uid = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
               AND media_type = 'upload'
               AND status IS DISTINCT FROM 'ready'
               AND stream_uid IS NULL
             RETURNING ${mediaColumns}`,
            [id, streamUid],
        );
        const updated = result.rows[0];
        if (updated) {
            return UserMediaSchema.parse(updated);
        }

        const current = await this.database.query<UserMediaRow>(
            `SELECT ${mediaColumns}
             FROM user_media
             WHERE id = $1`,
            [id],
        );
        const existing = current.rows[0];
        if (existing?.stream_uid === streamUid) {
            return UserMediaSchema.parse(existing);
        }
        return null;
    }

    async markStreamReady(ctx: Context, id: string, streamUrl: string, streamUid: string): Promise<UserMedia | null> {
        this.log.trace(`${ctx.traceId} ready user_media ${id}`);
        const result = await this.database.query<UserMediaRow>(
            `UPDATE user_media
             SET status = 'ready',
                 stream_url = $2,
                 stream_uid = COALESCE(stream_uid, $3),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
               AND media_type = 'upload'
               AND status IS DISTINCT FROM 'ready'
               AND (stream_uid IS NULL OR stream_uid = $3)
             RETURNING ${mediaColumns}`,
            [id, streamUrl, streamUid],
        );
        const updated = result.rows[0];
        if (updated) {
            return UserMediaSchema.parse(updated);
        }

        const current = await this.database.query<UserMediaRow>(
            `SELECT ${mediaColumns}
             FROM user_media
             WHERE id = $1`,
            [id],
        );
        const existing = current.rows[0];
        if (existing?.status === 'ready' && existing.stream_url === streamUrl && existing.stream_uid === streamUid) {
            return UserMediaSchema.parse(existing);
        }
        return null;
    }
}

type SqlQuery = <R extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
) => Promise<{ rows: R[] }>;

async function lockAccount(query: SqlQuery, userAccountId: string): Promise<void> {
    await query(
        `SELECT id FROM user_account WHERE id = $1 FOR UPDATE`,
        [userAccountId],
    );
}

function requiredRow(row: UserMediaRow | undefined, action: string): UserMedia {
    if (!row) {
        throw new Error(`${action} returned no row`);
    }
    return UserMediaSchema.parse(row);
}

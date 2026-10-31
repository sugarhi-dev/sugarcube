import { Database, Repository, type Context } from '@sugarcube/server-core';
import { UserMediaSchema, type UserMedia } from '../entities/userMedia.js';

type UserMediaRow = {
    id: string;
    user_profile_id: string;
    media_type: UserMedia['media_type'];
    ref: string;
    thumbnail: string | null;
    sort_order: number;
};

const mediaColumns = 'id, user_profile_id, media_type, ref, thumbnail, sort_order';

export class UserMediaRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listUserMedia(ctx: Context, userProfileId: string): Promise<UserMedia[]> {
        this.log.trace(`${ctx.traceId} select user_media ${userProfileId}`);
        const result = await this.database.query<UserMediaRow>(
            `SELECT ${mediaColumns}
             FROM user_media
             WHERE user_profile_id = $1
             ORDER BY sort_order, created_at`,
            [userProfileId],
        );
        return result.rows.map((row) => UserMediaSchema.parse(row));
    }

    async findUserMedia(ctx: Context, userProfileId: string, id: string): Promise<UserMedia | null> {
        this.log.trace(`${ctx.traceId} select user_media ${id}`);
        const result = await this.database.query<UserMediaRow>(
            `SELECT ${mediaColumns}
             FROM user_media
             WHERE id = $1 AND user_profile_id = $2`,
            [id, userProfileId],
        );
        const row = result.rows[0];
        return row ? UserMediaSchema.parse(row) : null;
    }

    async createUserMedia(ctx: Context, media: Omit<UserMedia, 'sort_order'>): Promise<UserMedia> {
        this.log.trace(`${ctx.traceId} insert user_media ${media.id}`);
        return this.database.transaction(async (query) => {
            await lockProfile(query, media.user_profile_id);
            const next = await query<{ sort_order: number }>(
                `SELECT COALESCE(MAX(sort_order), -1) + 1 AS sort_order
                 FROM user_media
                 WHERE user_profile_id = $1`,
                [media.user_profile_id],
            );
            const sortOrder = Number(next.rows[0]?.sort_order ?? 0);
            const result = await query<UserMediaRow>(
                `INSERT INTO user_media (id, user_profile_id, media_type, ref, thumbnail, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING ${mediaColumns}`,
                [media.id, media.user_profile_id, media.media_type, media.ref, media.thumbnail, sortOrder],
            );
            return requiredRow(result.rows[0], `insert user_media ${media.id}`);
        });
    }

    async reorderUserMedia(ctx: Context, userProfileId: string, ids: string[]): Promise<UserMedia[] | null> {
        this.log.trace(`${ctx.traceId} reorder user_media ${userProfileId}`);
        return this.database.transaction(async (query) => {
            await lockProfile(query, userProfileId);
            const existing = await query<{ id: string }>(
                `SELECT id
                 FROM user_media
                 WHERE user_profile_id = $1
                 ORDER BY sort_order, created_at`,
                [userProfileId],
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
                     WHERE id = $1 AND user_profile_id = $2`,
                    [order[sortOrder], userProfileId, sortOrder],
                );
            }

            const listed = await query<UserMediaRow>(
                `SELECT ${mediaColumns}
                 FROM user_media
                 WHERE user_profile_id = $1
                 ORDER BY sort_order, created_at`,
                [userProfileId],
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
             WHERE id = $1 AND user_profile_id = $2
             RETURNING ${mediaColumns}`,
            [media.id, media.user_profile_id, media.media_type, media.ref, media.thumbnail],
        );
        const row = result.rows[0];
        return row ? UserMediaSchema.parse(row) : null;
    }

    async deleteUserMedia(ctx: Context, userProfileId: string, id: string): Promise<UserMedia | null> {
        this.log.trace(`${ctx.traceId} delete user_media ${id}`);
        const result = await this.database.query<UserMediaRow>(
            `DELETE FROM user_media
             WHERE id = $1 AND user_profile_id = $2
             RETURNING ${mediaColumns}`,
            [id, userProfileId],
        );
        const row = result.rows[0];
        return row ? UserMediaSchema.parse(row) : null;
    }
}

type SqlQuery = <R extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
) => Promise<{ rows: R[] }>;

async function lockProfile(query: SqlQuery, userProfileId: string): Promise<void> {
    await query(
        `SELECT id FROM user_profile WHERE id = $1 FOR UPDATE`,
        [userProfileId],
    );
}

function requiredRow(row: UserMediaRow | undefined, action: string): UserMedia {
    if (!row) {
        throw new Error(`${action} returned no row`);
    }
    return UserMediaSchema.parse(row);
}

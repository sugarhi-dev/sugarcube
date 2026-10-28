import { Database, Repository, type Context } from '@sugarcube/server-core';
import { UserLocaleSchema, type UserLocale } from '../entities/userLocale.js';

type UserLocaleRow = {
    id: string;
    user_profile_id: string;
    production_city_id: string;
    home_city: boolean;
};

export class UserLocaleRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listUserLocales(ctx: Context, userProfileId: string): Promise<UserLocale[]> {
        this.log.trace(`${ctx.traceId} select user_locale ${userProfileId}`);
        const result = await this.database.query<UserLocaleRow>(
            `SELECT id, user_profile_id, production_city_id, home_city
             FROM user_locale
             WHERE user_profile_id = $1
             ORDER BY home_city DESC, created_at`,
            [userProfileId],
        );
        return result.rows.map((row) => UserLocaleSchema.parse(row));
    }

    async findUserLocale(ctx: Context, userProfileId: string, id: string): Promise<UserLocale | null> {
        this.log.trace(`${ctx.traceId} select user_locale ${id}`);
        const result = await this.database.query<UserLocaleRow>(
            `SELECT id, user_profile_id, production_city_id, home_city
             FROM user_locale
             WHERE id = $1 AND user_profile_id = $2`,
            [id, userProfileId],
        );
        const row = result.rows[0];
        return row ? UserLocaleSchema.parse(row) : null;
    }

    async createUserLocale(ctx: Context, locale: UserLocale): Promise<UserLocale> {
        this.log.trace(`${ctx.traceId} insert user_locale ${locale.id}`);
        return this.database.transaction(async (query) => {
            await lockProfile(query, locale.user_profile_id);
            if (locale.home_city) {
                await clearHomeCity(query, locale.user_profile_id);
            }
            const result = await query<UserLocaleRow>(
                `INSERT INTO user_locale (id, user_profile_id, production_city_id, home_city)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, user_profile_id, production_city_id, home_city`,
                [locale.id, locale.user_profile_id, locale.production_city_id, locale.home_city],
            );
            return requiredRow(result.rows[0], `insert user_locale ${locale.id}`);
        });
    }

    async updateUserLocale(ctx: Context, locale: UserLocale): Promise<UserLocale | null> {
        this.log.trace(`${ctx.traceId} update user_locale ${locale.id}`);
        return this.database.transaction(async (query) => {
            await lockProfile(query, locale.user_profile_id);
            if (locale.home_city) {
                await query(
                    `UPDATE user_locale
                     SET home_city = false, updated_at = CURRENT_TIMESTAMP
                     WHERE user_profile_id = $1 AND id <> $2 AND home_city`,
                    [locale.user_profile_id, locale.id],
                );
            }
            const result = await query<UserLocaleRow>(
                `UPDATE user_locale
                 SET production_city_id = $3,
                     home_city = $4,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND user_profile_id = $2
                 RETURNING id, user_profile_id, production_city_id, home_city`,
                [locale.id, locale.user_profile_id, locale.production_city_id, locale.home_city],
            );
            const row = result.rows[0];
            return row ? UserLocaleSchema.parse(row) : null;
        });
    }

    async deleteUserLocale(ctx: Context, userProfileId: string, id: string): Promise<boolean> {
        this.log.trace(`${ctx.traceId} delete user_locale ${id}`);
        const result = await this.database.query(
            `DELETE FROM user_locale
             WHERE id = $1 AND user_profile_id = $2`,
            [id, userProfileId],
        );
        return (result.rowCount ?? 0) > 0;
    }
}

type SqlQuery = Parameters<Database['transaction']>[0] extends (query: infer Q) => unknown ? Q : never;

async function lockProfile(query: SqlQuery, userProfileId: string): Promise<void> {
    await query(
        `SELECT id FROM user_profile WHERE id = $1 FOR UPDATE`,
        [userProfileId],
    );
}

async function clearHomeCity(query: SqlQuery, userProfileId: string): Promise<void> {
    await query(
        `UPDATE user_locale
         SET home_city = false, updated_at = CURRENT_TIMESTAMP
         WHERE user_profile_id = $1 AND home_city`,
        [userProfileId],
    );
}

function requiredRow(row: UserLocaleRow | undefined, action: string): UserLocale {
    if (!row) {
        throw new Error(`${action} returned no row`);
    }
    return UserLocaleSchema.parse(row);
}

import { Database, Repository, type Context } from '@sugarcube/server-core';
import { UserWorkProfileSchema, WorkProfileChoiceSchema, type UserWorkProfile, type WorkProfileChoice } from '../entities/userWorkProfile.js';

const userWorkProfileColumns = `id, user_account_id, day_rate, currency_id, union_status, flat_fee,
    projects_completed, years_in_business, response_time_hours, discipline_id, position_id, bio, title, status`;

type UserWorkProfileRow = {
    id: string;
    user_account_id: string;
    day_rate: string | null;
    currency_id: string | null;
    union_status: string;
    flat_fee: boolean;
    projects_completed: number | string | null;
    years_in_business: number | string | null;
    response_time_hours: number | string | null;
    discipline_id: string | null;
    position_id: string | null;
    bio: string | null;
    title: string | null;
    status: string;
};

export class UserWorkProfileRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listWorkProfileChoices(ctx: Context, userAccountId: string): Promise<WorkProfileChoice[]> {
        this.log.trace(`${ctx.traceId} select user_work_profile choices ${userAccountId}`);
        const result = await this.database.query(
            `SELECT work.id,
                    work.status,
                    work.title,
                    position.name AS position,
                    city.name AS city
             FROM user_work_profile work
             LEFT JOIN positions position ON position.id = work.position_id
             LEFT JOIN user_locale locale
                ON locale.user_work_profile_id = work.id AND locale.home_city
             LEFT JOIN production_cities city ON city.id = locale.production_city_id
             WHERE work.user_account_id = $1
             ORDER BY work.created_at, work.id`,
            [userAccountId],
        );
        return result.rows.map((row) => WorkProfileChoiceSchema.parse(row));
    }

    async findUserWorkProfile(ctx: Context, userAccountId: string): Promise<UserWorkProfile | null> {
        this.log.trace(`${ctx.traceId} select user_work_profile ${userAccountId}`);
        const result = await this.database.query<UserWorkProfileRow>(
            `SELECT ${userWorkProfileColumns}
             FROM user_work_profile
             WHERE id = (SELECT viewing_work_profile_id FROM user_account WHERE id = $1)`,
            [userAccountId],
        );
        const row = result.rows[0];
        return row ? mapUserWorkProfile(row) : null;
    }

    async saveUserWorkProfile(
        ctx: Context,
        profile: UserWorkProfile,
    ): Promise<{ profile: UserWorkProfile; created: boolean }> {
        this.log.trace(`${ctx.traceId} save user_work_profile ${profile.user_account_id}`);
        return this.database.transaction(async (query) => {
            await query(
                `SELECT id FROM user_account WHERE id = $1 FOR UPDATE`,
                [profile.user_account_id],
            );
            const existing = await query<{ id: string }>(
                `SELECT viewing_work_profile_id AS id
                 FROM user_account
                 WHERE id = $1`,
                [profile.user_account_id],
            );
            const existingId = existing.rows[0]?.id;
            if (existingId) {
                const result = await query<UserWorkProfileRow>(
                    `UPDATE user_work_profile
                     SET day_rate = $2,
                         currency_id = $3,
                         union_status = $4,
                         flat_fee = $5,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1
                     RETURNING ${userWorkProfileColumns}`,
                    [existingId, profile.day_rate, profile.currency_id, profile.union_status, profile.flat_fee],
                );
                return { profile: requiredRow(result.rows[0], `update user_work_profile ${existingId}`), created: false };
            }

            const result = await query<UserWorkProfileRow>(
                `INSERT INTO user_work_profile (id, user_account_id, day_rate, currency_id, union_status, flat_fee, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'draft')
                 RETURNING ${userWorkProfileColumns}`,
                [profile.id, profile.user_account_id, profile.day_rate, profile.currency_id, profile.union_status, profile.flat_fee],
            );
            await query(
                `UPDATE user_account
                 SET viewing_work_profile_id = $2,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [profile.user_account_id, profile.id],
            );
            return { profile: requiredRow(result.rows[0], `insert user_work_profile ${profile.id}`), created: true };
        });
    }

    async deleteUserWorkProfile(ctx: Context, userAccountId: string): Promise<boolean> {
        this.log.trace(`${ctx.traceId} delete user_work_profile ${userAccountId}`);
        return this.database.transaction(async (query) => {
            const current = await query<{ id: string | null }>(
                `SELECT viewing_work_profile_id AS id
                 FROM user_account
                 WHERE id = $1
                 FOR UPDATE`,
                [userAccountId],
            );
            const profileId = current.rows[0]?.id;
            if (!profileId) {
                return false;
            }

            await query(
                `DELETE FROM project_project_type
                 WHERE project_id IN (SELECT id FROM projects WHERE user_work_profile_id = $1)`,
                [profileId],
            );
            await query(`DELETE FROM projects WHERE user_work_profile_id = $1`, [profileId]);
            await query(`DELETE FROM user_media WHERE user_work_profile_id = $1`, [profileId]);
            await query(`DELETE FROM user_availability WHERE user_work_profile_id = $1`, [profileId]);
            await query(`DELETE FROM user_locale WHERE user_work_profile_id = $1`, [profileId]);

            const next = await query<{ id: string }>(
                `SELECT id
                 FROM user_work_profile
                 WHERE user_account_id = $1 AND id <> $2
                 ORDER BY (status = 'live') DESC, created_at DESC
                 LIMIT 1`,
                [userAccountId, profileId],
            );
            await query(
                `UPDATE user_account
                 SET viewing_work_profile_id = $2,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [userAccountId, next.rows[0]?.id ?? null],
            );
            const deleted = await query(
                `DELETE FROM user_work_profile WHERE id = $1 AND user_account_id = $2`,
                [profileId, userAccountId],
            );
            return (deleted.rowCount ?? 0) > 0;
        });
    }
}

function mapUserWorkProfile(row: UserWorkProfileRow): UserWorkProfile {
    return UserWorkProfileSchema.parse({
        id: row.id,
        user_account_id: row.user_account_id,
        day_rate: row.day_rate === null ? null : Number(Number(row.day_rate).toFixed(2)),
        currency_id: row.currency_id,
        union_status: row.union_status,
        flat_fee: row.flat_fee,
        projects_completed: readCount(row.projects_completed),
        years_in_business: readCount(row.years_in_business),
        response_time_hours: readCount(row.response_time_hours),
        discipline_id: row.discipline_id,
        position_id: row.position_id,
        bio: row.bio,
        title: row.title,
        status: row.status,
    });
}

function readCount(value: number | string | null): number | null {
    if (value === null) {
        return null;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function requiredRow(row: UserWorkProfileRow | undefined, action: string): UserWorkProfile {
    if (!row) {
        throw new Error(`${action} returned no row`);
    }
    return mapUserWorkProfile(row);
}

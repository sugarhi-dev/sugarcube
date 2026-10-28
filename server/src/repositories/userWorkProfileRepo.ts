import { Database, Repository, type Context } from '@sugarcube/server-core';
import { UserWorkProfileSchema, type UserWorkProfile } from '../entities/userWorkProfile.js';

type UserWorkProfileRow = {
    id: string;
    user_profile_id: string;
    day_rate: string | null;
    currency_id: string | null;
    union_status: string;
    flat_fee: boolean;
};

export class UserWorkProfileRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async findUserWorkProfile(ctx: Context, userProfileId: string): Promise<UserWorkProfile | null> {
        this.log.trace(`${ctx.traceId} select user_work_profile ${userProfileId}`);
        const result = await this.database.query<UserWorkProfileRow>(
            `SELECT id, user_profile_id, day_rate, currency_id, union_status, flat_fee
             FROM user_work_profile
             WHERE user_profile_id = $1`,
            [userProfileId],
        );
        const row = result.rows[0];
        return row ? mapUserWorkProfile(row) : null;
    }

    async saveUserWorkProfile(
        ctx: Context,
        profile: UserWorkProfile,
    ): Promise<{ profile: UserWorkProfile; created: boolean }> {
        this.log.trace(`${ctx.traceId} save user_work_profile ${profile.user_profile_id}`);
        return this.database.transaction(async (query) => {
            await query(
                `SELECT id FROM user_profile WHERE id = $1 FOR UPDATE`,
                [profile.user_profile_id],
            );
            const existing = await query<{ id: string }>(
                `SELECT id FROM user_work_profile WHERE user_profile_id = $1`,
                [profile.user_profile_id],
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
                     RETURNING id, user_profile_id, day_rate, currency_id, union_status, flat_fee`,
                    [existingId, profile.day_rate, profile.currency_id, profile.union_status, profile.flat_fee],
                );
                return { profile: requiredRow(result.rows[0], `update user_work_profile ${existingId}`), created: false };
            }

            const result = await query<UserWorkProfileRow>(
                `INSERT INTO user_work_profile (id, user_profile_id, day_rate, currency_id, union_status, flat_fee)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, user_profile_id, day_rate, currency_id, union_status, flat_fee`,
                [profile.id, profile.user_profile_id, profile.day_rate, profile.currency_id, profile.union_status, profile.flat_fee],
            );
            return { profile: requiredRow(result.rows[0], `insert user_work_profile ${profile.id}`), created: true };
        });
    }

    async deleteUserWorkProfile(ctx: Context, userProfileId: string): Promise<boolean> {
        this.log.trace(`${ctx.traceId} delete user_work_profile ${userProfileId}`);
        const result = await this.database.query(
            `DELETE FROM user_work_profile
             WHERE user_profile_id = $1`,
            [userProfileId],
        );
        return (result.rowCount ?? 0) > 0;
    }
}

function mapUserWorkProfile(row: UserWorkProfileRow): UserWorkProfile {
    return UserWorkProfileSchema.parse({
        id: row.id,
        user_profile_id: row.user_profile_id,
        day_rate: row.day_rate === null ? null : Number(Number(row.day_rate).toFixed(2)),
        currency_id: row.currency_id,
        union_status: row.union_status,
        flat_fee: row.flat_fee,
    });
}

function requiredRow(row: UserWorkProfileRow | undefined, action: string): UserWorkProfile {
    if (!row) {
        throw new Error(`${action} returned no row`);
    }
    return mapUserWorkProfile(row);
}

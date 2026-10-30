import { Database, Repository, type Context } from '@sugarcube/server-core';
import { UserSchema, type AccountType, type User } from '../entities/user.js';
import type { UserLocale } from '../entities/userLocale.js';
import type { UnionStatus } from '../entities/userWorkProfile.js';
import type { WorkProfile } from '../entities/workProfile.js';

const userColumns = 'id, first_name, last_name, email, phone, bio, photo, keycloak_id, status, account_type';

type UserRow = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    bio: string | null;
    photo: string | null;
    keycloak_id: string;
    status: string;
    account_type: string | null;
};

export class UserRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async createUser(ctx: Context, user: User): Promise<void> {
        this.log.trace(`${ctx.traceId} insert user_profile ${user.id}`);
        await this.database.query(
            `INSERT INTO user_profile (id, first_name, last_name, email, phone, keycloak_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (keycloak_id) DO UPDATE
             SET first_name = EXCLUDED.first_name,
                 last_name = EXCLUDED.last_name,
                 email = EXCLUDED.email,
                 updated_at = CURRENT_TIMESTAMP`,
            [user.id, user.first_name, user.last_name, user.email, user.phone, user.keycloak_id, user.status],
        );
    }

    async findUserByKeycloakId(ctx: Context, keycloakId: string): Promise<User | null> {
        this.log.trace(`${ctx.traceId} select user_profile ${keycloakId}`);
        const result = await this.database.query<UserRow>(
            `SELECT ${userColumns}
             FROM user_profile
             WHERE keycloak_id = $1`,
            [keycloakId],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }

    async chooseAccountType(ctx: Context, userId: string, accountType: AccountType): Promise<User | null> {
        this.log.trace(`${ctx.traceId} choose account type ${userId} ${accountType}`);
        const result = await this.database.query<UserRow>(
            `UPDATE user_profile
             SET account_type = $2,
                 status = 'basic',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status IN ('new', 'basic')
             RETURNING ${userColumns}`,
            [userId, accountType],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }

    async saveBasic(ctx: Context, userId: string, input: BasicWrite): Promise<User | null> {
        this.log.trace(`${ctx.traceId} save basic profile ${userId}`);
        const result = await this.database.query<UserRow>(
            `UPDATE user_profile
             SET phone = $2,
                 bio = $3,
                 status = 'setup',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'basic'
             RETURNING ${userColumns}`,
            [userId, input.phone, input.bio],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }

    async savePhoto(ctx: Context, userId: string, photo: string): Promise<User | null> {
        this.log.trace(`${ctx.traceId} save profile photo ${userId}`);
        const result = await this.database.query<UserRow>(
            `UPDATE user_profile
             SET photo = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'basic'
             RETURNING ${userColumns}`,
            [userId, photo],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }

    async completeSetup(ctx: Context, input: SetupWrite): Promise<User | null> {
        const userId = input.workProfile.user_profile_id;
        this.log.trace(`${ctx.traceId} complete setup ${userId}`);
        if (input.locales.some((locale) => locale.user_profile_id !== userId)) {
            throw new Error('Locale does not belong to the profile.');
        }

        return this.database.transaction(async (query) => {
            const locked = await query<{ id: string }>(
                `SELECT id
                 FROM user_profile
                 WHERE id = $1 AND status = 'setup'
                 FOR UPDATE`,
                [userId],
            );
            if (!locked.rows[0]) {
                return null;
            }

            await query(
                `DELETE FROM work_profile
                 WHERE user_profile_id = $1`,
                [userId],
            );
            await query(
                `INSERT INTO work_profile (id, user_profile_id, discipline_id, position_id)
                 VALUES ($1, $2, $3, $4)`,
                [
                    input.workProfile.id,
                    userId,
                    input.workProfile.discipline_id,
                    input.workProfile.position_id,
                ],
            );

            const existingRate = await query<{ id: string }>(
                `SELECT id FROM user_work_profile WHERE user_profile_id = $1`,
                [userId],
            );
            const rateId = existingRate.rows[0]?.id;
            if (rateId) {
                await query(
                    `UPDATE user_work_profile
                     SET day_rate = $2,
                         currency_id = $3,
                         union_status = $4,
                         flat_fee = $5,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [rateId, input.day_rate, input.currency_id, input.union_status, input.flat_fee],
                );
            } else {
                await query(
                    `INSERT INTO user_work_profile (id, user_profile_id, day_rate, currency_id, union_status, flat_fee)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [input.rate_id, userId, input.day_rate, input.currency_id, input.union_status, input.flat_fee],
                );
            }

            await query(
                `DELETE FROM user_locale
                 WHERE user_profile_id = $1`,
                [userId],
            );
            for (const locale of input.locales) {
                await query(
                    `INSERT INTO user_locale (id, user_profile_id, production_city_id, home_city)
                     VALUES ($1, $2, $3, $4)`,
                    [locale.id, locale.user_profile_id, locale.production_city_id, locale.home_city],
                );
            }

            const updated = await query<UserRow>(
                `UPDATE user_profile
                 SET status = 'experience',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND status = 'setup'
                 RETURNING ${userColumns}`,
                [userId],
            );
            const row = updated.rows[0];
            return row ? UserSchema.parse(row) : null;
        });
    }

    async completeExperience(ctx: Context, userId: string): Promise<User | null> {
        this.log.trace(`${ctx.traceId} complete experience ${userId}`);
        const result = await this.database.query<UserRow>(
            `UPDATE user_profile
             SET status = 'media',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'experience'
             RETURNING ${userColumns}`,
            [userId],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }
}

export type BasicWrite = {
    phone: string;
    bio: string;
};

export type SetupWrite = {
    workProfile: WorkProfile;
    day_rate: number;
    currency_id: string;
    union_status: UnionStatus;
    flat_fee: boolean;
    rate_id: string;
    locales: UserLocale[];
};

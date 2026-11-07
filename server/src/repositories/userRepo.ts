import { Database, Repository, type Context } from '@sugarcube/server-core';
import { z } from 'zod';
import { AccountTypeSchema, AdminUserSchema, UserSchema, UserStatusSchema, type AccountType, type AdminUser, type User, type UserStatus } from '../entities/user.js';
import type { UserLocale } from '../entities/userLocale.js';
import { UnionStatusSchema, type UnionStatus } from '../entities/userWorkProfile.js';
import { WorkProfileSchema, type WorkProfile } from '../entities/workProfile.js';

const userColumns = 'id, first_name, last_name, email, phone, bio, title, photo, keycloak_id, status, account_type';

type UserRow = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    bio: string | null;
    title: string | null;
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

    async findUserById(ctx: Context, id: string): Promise<User | null> {
        this.log.trace(`${ctx.traceId} select user_profile ${id}`);
        const result = await this.database.query<UserRow>(
            `SELECT ${userColumns}
             FROM user_profile
             WHERE id = $1`,
            [id],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }

    async listUsers(ctx: Context): Promise<DirectoryUser[]> {
        this.log.trace(`${ctx.traceId} select user_profile`);
        const result = await this.database.query(
            `SELECT *
             FROM (
                 SELECT DISTINCT ON (profile.id)
                     profile.id,
                     profile.first_name,
                     profile.last_name,
                     profile.email,
                     profile.phone,
                     profile.status,
                     profile.account_type,
                     profile.photo,
                     profile.created_at,
                     profile.updated_at,
                     discipline.name AS discipline,
                     city.name AS city,
                     (SELECT COUNT(*) FROM work_profile WHERE user_profile_id = profile.id) AS profile_count
                 FROM user_profile profile
                 LEFT JOIN work_profile work ON work.user_profile_id = profile.id
                 LEFT JOIN disciplines discipline ON discipline.id = work.discipline_id
                 LEFT JOIN user_locale locale ON locale.user_profile_id = profile.id AND locale.home_city
                 LEFT JOIN production_cities city ON city.id = locale.production_city_id
                 ORDER BY profile.id, work.created_at NULLS LAST, work.id
             ) directory
             ORDER BY created_at DESC, id DESC`,
        );
        return result.rows.map((row) => DirectoryUserSchema.parse(row));
    }

    async listApprovals(ctx: Context): Promise<Approval[]> {
        this.log.trace(`${ctx.traceId} select profiles in review`);
        const result = await this.database.query(
            `SELECT *
             FROM (
                 SELECT DISTINCT ON (profile.id)
                     profile.id,
                     profile.first_name,
                     profile.last_name,
                     profile.email,
                     profile.status,
                     profile.account_type,
                     profile.photo,
                     position.name AS position,
                     discipline.name AS discipline,
                     city.name AS city,
                     rates.day_rate,
                     TRIM(currency.code) AS currency_code,
                     rates.union_status,
                     (SELECT COUNT(*) FROM projects WHERE user_profile_id = profile.id) AS credit_count,
                     (SELECT COUNT(*) FROM user_media WHERE user_profile_id = profile.id) AS media_count,
                     profile.updated_at
                 FROM user_profile profile
                 LEFT JOIN work_profile work ON work.user_profile_id = profile.id
                 LEFT JOIN positions position ON position.id = work.position_id
                 LEFT JOIN disciplines discipline ON discipline.id = work.discipline_id
                 LEFT JOIN user_work_profile rates ON rates.user_profile_id = profile.id
                 LEFT JOIN currency ON currency.id = rates.currency_id
                 LEFT JOIN user_locale locale ON locale.user_profile_id = profile.id AND locale.home_city
                 LEFT JOIN production_cities city ON city.id = locale.production_city_id
                 WHERE profile.status IN ('review', 'admin-review')
                 ORDER BY profile.id, work.created_at NULLS LAST, work.id
             ) approval
             ORDER BY updated_at DESC, id DESC`,
        );
        return result.rows.map((row) => ApprovalSchema.parse(row));
    }

    async returnToReview(ctx: Context, id: string): Promise<AdminUser | null> {
        this.log.trace(`${ctx.traceId} return user_profile ${id} to review`);
        const result = await this.database.query<AdminUser>(
            `UPDATE user_profile
             SET status = 'review',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'admin-review'
             RETURNING id, first_name, last_name, email, phone, status, account_type, created_at, updated_at`,
            [id],
        );
        const row = result.rows[0];
        return row ? AdminUserSchema.parse(row) : null;
    }

    async backToReview(ctx: Context, id: string): Promise<AdminUser | null> {
        this.log.trace(`${ctx.traceId} set user_profile ${id} back to review`);
        const result = await this.database.query<AdminUser>(
            `UPDATE user_profile
             SET status = 'review',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status <> 'review'
             RETURNING id, first_name, last_name, email, phone, status, account_type, created_at, updated_at`,
            [id],
        );
        const row = result.rows[0];
        return row ? AdminUserSchema.parse(row) : null;
    }

    async returnToAdminReview(ctx: Context, id: string): Promise<AdminUser | null> {
        this.log.trace(`${ctx.traceId} return user_profile ${id} to admin-review`);
        const result = await this.database.query<AdminUser>(
            `UPDATE user_profile
             SET status = 'admin-review',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'review'
             RETURNING id, first_name, last_name, email, phone, status, account_type, created_at, updated_at`,
            [id],
        );
        const row = result.rows[0];
        return row ? AdminUserSchema.parse(row) : null;
    }

    async approveUser(ctx: Context, id: string): Promise<AdminUser | null> {
        this.log.trace(`${ctx.traceId} approve user_profile ${id}`);
        const result = await this.database.query<AdminUser>(
            `UPDATE user_profile
             SET status = 'live',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status IN ('review', 'admin-review')
             RETURNING id, first_name, last_name, email, phone, status, account_type, created_at, updated_at`,
            [id],
        );
        const row = result.rows[0];
        return row ? AdminUserSchema.parse(row) : null;
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
                 title = $4,
                 status = CASE WHEN status = 'basic' THEN 'setup' ELSE status END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status IN ('basic', 'media', 'review')
             RETURNING ${userColumns}`,
            [userId, input.phone, input.bio, input.title],
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
             WHERE id = $1 AND status IN ('basic', 'media', 'review')
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
                 WHERE id = $1 AND status IN ('setup', 'media', 'review')
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
                 SET status = CASE WHEN status = 'setup' THEN 'experience' ELSE status END,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND status IN ('setup', 'media', 'review')
                 RETURNING ${userColumns}`,
                [userId],
            );
            const row = updated.rows[0];
            return row ? UserSchema.parse(row) : null;
        });
    }

    async listWorkProfiles(ctx: Context, userId: string): Promise<WorkProfile[]> {
        this.log.trace(`${ctx.traceId} select work_profile ${userId}`);
        const result = await this.database.query<WorkProfile>(
            `SELECT id, user_profile_id, discipline_id, position_id
             FROM work_profile
             WHERE user_profile_id = $1
             ORDER BY created_at`,
            [userId],
        );
        return result.rows.map((row) => WorkProfileSchema.parse(row));
    }

    async returnToStep(ctx: Context, userId: string, target: UserStatus, from: UserStatus): Promise<User | null> {
        this.log.trace(`${ctx.traceId} return to step ${userId} ${target}`);
        const result = await this.database.query<UserRow>(
            `UPDATE user_profile
             SET status = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status IN ($2, $3)
             RETURNING ${userColumns}`,
            [userId, target, from],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }

    async completeExperience(ctx: Context, userId: string, stats: ExperienceStatsWrite): Promise<ExperienceCompletion> {
        this.log.trace(`${ctx.traceId} complete experience ${userId}`);
        return this.database.transaction(async (query) => {
            const locked = await query<{ status: string }>(
                `SELECT status
                 FROM user_profile
                 WHERE id = $1
                 FOR UPDATE`,
                [userId],
            );
            if (locked.rows[0]?.status !== 'experience') {
                return { outcome: 'wrong-step' };
            }

            const rates = await query(
                `UPDATE user_work_profile
                 SET projects_completed = $2,
                     years_in_business = $3,
                     response_time_hours = $4,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_profile_id = $1`,
                [userId, stats.projects_completed, stats.years_in_business, stats.response_time_hours],
            );
            if ((rates.rowCount ?? 0) === 0) {
                return { outcome: 'missing-profile' };
            }

            const updated = await query<UserRow>(
                `UPDATE user_profile
                 SET status = 'media',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND status = 'experience'
                 RETURNING ${userColumns}`,
                [userId],
            );
            const row = updated.rows[0];
            if (!row) {
                return { outcome: 'wrong-step' };
            }
            return { outcome: 'ok', user: UserSchema.parse(row) };
        });
    }

    async completeMedia(ctx: Context, userId: string): Promise<User | null> {
        this.log.trace(`${ctx.traceId} complete media ${userId}`);
        const result = await this.database.query<UserRow>(
            `UPDATE user_profile
             SET status = 'review',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'media'
             RETURNING ${userColumns}`,
            [userId],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }

    async submitForReview(ctx: Context, userId: string): Promise<SubmitForReviewResult> {
        this.log.trace(`${ctx.traceId} submit profile for review ${userId}`);
        return this.database.transaction(async (query) => {
            const locked = await query<UserRow>(
                `SELECT ${userColumns}
                 FROM user_profile
                 WHERE id = $1 AND status IN ('media', 'review', 'admin-review')
                 FOR UPDATE`,
                [userId],
            );
            const current = locked.rows[0];
            if (!current) {
                return { status: 'unavailable' };
            }
            if (current.status === 'admin-review') {
                return { status: 'ok', user: UserSchema.parse(current) };
            }

            const counted = await query<{ count: number }>(
                `SELECT COUNT(*)::int AS count
                 FROM user_media
                 WHERE user_profile_id = $1`,
                [userId],
            );
            if (Number(counted.rows[0]?.count ?? 0) < 2) {
                return { status: 'incomplete' };
            }

            const updated = await query<UserRow>(
                `UPDATE user_profile
                 SET status = 'admin-review',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND status = $2
                 RETURNING ${userColumns}`,
                [userId, current.status],
            );
            const row = updated.rows[0];
            return row ? { status: 'ok', user: UserSchema.parse(row) } : { status: 'unavailable' };
        });
    }
}

const optionalNumber = z.preprocess(
    (value) => value === null || value === undefined ? null : Number(value),
    z.number().nullable(),
);

export const ApprovalSchema = z.object({
    id: z.ulid(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.email(),
    status: UserStatusSchema,
    account_type: AccountTypeSchema.nullable(),
    photo: z.ulid().nullable(),
    position: z.string().nullable(),
    discipline: z.string().nullable(),
    city: z.string().nullable(),
    day_rate: optionalNumber,
    currency_code: z.preprocess(
        (value) => typeof value === 'string' ? value.trim() : value,
        z.string().length(3).nullable(),
    ),
    union_status: UnionStatusSchema.nullable(),
    credit_count: z.coerce.number().int(),
    media_count: z.coerce.number().int(),
    updated_at: z.coerce.date(),
}).strip();

export type Approval = z.infer<typeof ApprovalSchema>;

export const DirectoryUserSchema = AdminUserSchema.extend({
    photo: z.ulid().nullable(),
    discipline: z.string().nullable(),
    city: z.string().nullable(),
    profile_count: z.coerce.number().int(),
}).strip();

export type DirectoryUser = z.infer<typeof DirectoryUserSchema>;

export type SubmitForReviewResult =
    | { status: 'ok'; user: User }
    | { status: 'incomplete' }
    | { status: 'unavailable' };

export type ExperienceStatsWrite = {
    projects_completed: number;
    years_in_business: number;
    response_time_hours: number;
};

export type ExperienceCompletion =
    | { outcome: 'ok'; user: User }
    | { outcome: 'wrong-step' }
    | { outcome: 'missing-profile' };

export type BasicWrite = {
    phone: string;
    bio: string;
    title: string;
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

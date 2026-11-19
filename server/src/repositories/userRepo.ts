import { Database, Repository, type Context } from '@sugarcube/server-core';
import { z } from 'zod';
import { AccountTypeSchema, AdminUserSchema, UserSchema, UserStatusSchema, type AccountType, type AdminUser, type User, type UserStatus } from '../entities/user.js';
import type { UserLocale } from '../entities/userLocale.js';
import { UnionStatusSchema, type UnionStatus } from '../entities/userWorkProfile.js';

const userColumns = 'id, first_name, last_name, email, phone, photo, keycloak_id, status, account_type';

type UserRow = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
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
        this.log.trace(`${ctx.traceId} insert user_account ${user.id}`);
        await this.database.query(
            `INSERT INTO user_account (id, first_name, last_name, email, phone, keycloak_id, status)
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
        this.log.trace(`${ctx.traceId} select user_account ${keycloakId}`);
        const result = await this.database.query<UserRow>(
            `SELECT ${userColumns}
             FROM user_account
             WHERE keycloak_id = $1`,
            [keycloakId],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }

    async findUserById(ctx: Context, id: string): Promise<User | null> {
        this.log.trace(`${ctx.traceId} select user_account ${id}`);
        const result = await this.database.query<UserRow>(
            `SELECT ${userColumns}
             FROM user_account
             WHERE id = $1`,
            [id],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }

    async listUsers(ctx: Context): Promise<DirectoryUser[]> {
        this.log.trace(`${ctx.traceId} select user_account`);
        const result = await this.database.query(
            `SELECT account.id,
                    account.first_name,
                    account.last_name,
                    account.email,
                    account.phone,
                    account.status,
                    account.account_type,
                    account.photo,
                    account.created_at,
                    account.updated_at,
                    discipline.name AS discipline,
                    city.name AS city,
                    (SELECT COUNT(*)::int
                     FROM user_work_profile counted
                     WHERE counted.user_account_id = account.id) AS profile_count
             FROM user_account account
             LEFT JOIN user_work_profile work ON work.id = account.viewing_work_profile_id
             LEFT JOIN disciplines discipline ON discipline.id = work.discipline_id
             LEFT JOIN user_locale locale ON locale.user_work_profile_id = work.id AND locale.home_city
             LEFT JOIN production_cities city ON city.id = locale.production_city_id
             ORDER BY account.created_at DESC, account.id DESC`,
        );
        return result.rows.map((row) => DirectoryUserSchema.parse(row));
    }

    async listApprovals(ctx: Context): Promise<Approval[]> {
        this.log.trace(`${ctx.traceId} select accounts in review`);
        const result = await this.database.query(
            `SELECT account.id,
                    account.first_name,
                    account.last_name,
                    account.email,
                    account.status,
                    account.account_type,
                    account.photo,
                    position.name AS position,
                    discipline.name AS discipline,
                    city.name AS city,
                    work.day_rate,
                    TRIM(currency.code) AS currency_code,
                    work.union_status,
                    (SELECT COUNT(*) FROM projects WHERE user_work_profile_id = work.id) AS credit_count,
                    (SELECT COUNT(*) FROM user_media WHERE user_work_profile_id = work.id) AS media_count,
                    account.updated_at
             FROM user_account account
             LEFT JOIN user_work_profile work ON work.id = account.viewing_work_profile_id
             LEFT JOIN positions position ON position.id = work.position_id
             LEFT JOIN disciplines discipline ON discipline.id = work.discipline_id
             LEFT JOIN currency ON currency.id = work.currency_id
             LEFT JOIN user_locale locale ON locale.user_work_profile_id = work.id AND locale.home_city
             LEFT JOIN production_cities city ON city.id = locale.production_city_id
             WHERE account.status IN ('review', 'admin-review')
             ORDER BY account.updated_at DESC, account.id DESC`,
        );
        return result.rows.map((row) => ApprovalSchema.parse(row));
    }

    async returnToReview(ctx: Context, id: string): Promise<AdminUser | null> {
        this.log.trace(`${ctx.traceId} return user_account ${id} to review`);
        return this.database.transaction(async (query) => {
            const result = await query<AdminUser>(
                `UPDATE user_account
                 SET status = 'review',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND status = 'admin-review'
                 RETURNING id, first_name, last_name, email, phone, status, account_type, created_at, updated_at`,
                [id],
            );
            const row = result.rows[0];
            if (!row) {
                return null;
            }
            await query(
                `UPDATE user_work_profile
                 SET status = 'draft',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = (SELECT viewing_work_profile_id FROM user_account WHERE id = $1)
                   AND status = 'admin-review'`,
                [id],
            );
            return AdminUserSchema.parse(row);
        });
    }

    async backToReview(ctx: Context, id: string): Promise<AdminUser | null> {
        this.log.trace(`${ctx.traceId} set user_account ${id} back to review`);
        return this.database.transaction(async (query) => {
            const result = await query<AdminUser>(
                `UPDATE user_account
                 SET status = 'review',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND status <> 'review'
                 RETURNING id, first_name, last_name, email, phone, status, account_type, created_at, updated_at`,
                [id],
            );
            const row = result.rows[0];
            if (!row) {
                return null;
            }
            await query(
                `UPDATE user_work_profile
                 SET status = 'draft',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = (SELECT viewing_work_profile_id FROM user_account WHERE id = $1)`,
                [id],
            );
            return AdminUserSchema.parse(row);
        });
    }

    async returnToAdminReview(ctx: Context, id: string): Promise<AdminUser | null> {
        this.log.trace(`${ctx.traceId} return user_account ${id} to admin-review`);
        return this.database.transaction(async (query) => {
            const result = await query<AdminUser>(
                `UPDATE user_account
                 SET status = 'admin-review',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND status = 'review'
                 RETURNING id, first_name, last_name, email, phone, status, account_type, created_at, updated_at`,
                [id],
            );
            const row = result.rows[0];
            if (!row) {
                return null;
            }
            await query(
                `UPDATE user_work_profile
                 SET status = 'admin-review',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = (SELECT viewing_work_profile_id FROM user_account WHERE id = $1)
                   AND status = 'draft'`,
                [id],
            );
            return AdminUserSchema.parse(row);
        });
    }

    async deactivateAccount(ctx: Context, userId: string): Promise<User | null> {
        this.log.trace(`${ctx.traceId} deactivate user_account ${userId}`);
        const result = await this.database.query<UserRow>(
            `UPDATE user_account
             SET status = 'deactivated',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status <> 'deactivated'
             RETURNING ${userColumns}`,
            [userId],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }

    async deleteAccount(ctx: Context, userId: string): Promise<string[] | null> {
        this.log.trace(`${ctx.traceId} delete user_account ${userId}`);
        return this.database.transaction(async (query) => {
            const account = await query<{ photo: string | null }>(
                `SELECT photo FROM user_account WHERE id = $1 FOR UPDATE`,
                [userId],
            );
            const photo = account.rows[0]?.photo;
            if (!account.rows[0]) {
                return null;
            }

            const media = await query<{ ref: string; thumbnail: string | null; media_type: string }>(
                `SELECT ref, thumbnail, media_type
                 FROM user_media
                 WHERE user_account_id = $1`,
                [userId],
            );

            await query(
                `DELETE FROM project_project_type
                 WHERE project_id IN (SELECT id FROM projects WHERE user_account_id = $1)`,
                [userId],
            );
            await query(`DELETE FROM projects WHERE user_account_id = $1`, [userId]);
            await query(`DELETE FROM user_media WHERE user_account_id = $1`, [userId]);
            await query(`DELETE FROM user_availability WHERE user_account_id = $1`, [userId]);
            await query(`DELETE FROM user_locale WHERE user_account_id = $1`, [userId]);
            await query(
                `UPDATE user_account SET viewing_work_profile_id = NULL WHERE id = $1`,
                [userId],
            );
            await query(`DELETE FROM user_work_profile WHERE user_account_id = $1`, [userId]);
            await query(`DELETE FROM user_settings WHERE user_account_id = $1`, [userId]);
            await query(`DELETE FROM user_account WHERE id = $1`, [userId]);

            return storedBinaryIds(photo ?? null, media.rows);
        });
    }

    async reactivateUser(ctx: Context, id: string): Promise<AdminUser | null> {
        this.log.trace(`${ctx.traceId} reactivate user_account ${id}`);
        const result = await this.database.query<AdminUser>(
            `UPDATE user_account
             SET status = 'live',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'deactivated'
             RETURNING id, first_name, last_name, email, phone, status, account_type, created_at, updated_at`,
            [id],
        );
        const row = result.rows[0];
        return row ? AdminUserSchema.parse(row) : null;
    }

    async approveUser(ctx: Context, id: string): Promise<AdminUser | null> {
        this.log.trace(`${ctx.traceId} approve user_account ${id}`);
        return this.database.transaction(async (query) => {
            await query(
                `UPDATE user_work_profile
                 SET status = 'live',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = (SELECT viewing_work_profile_id FROM user_account WHERE id = $1)`,
                [id],
            );
            const result = await query<AdminUser>(
                `UPDATE user_account
                 SET status = 'live',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND status IN ('review', 'admin-review')
                 RETURNING id, first_name, last_name, email, phone, status, account_type, created_at, updated_at`,
                [id],
            );
            const row = result.rows[0];
            return row ? AdminUserSchema.parse(row) : null;
        });
    }

    async chooseAccountType(ctx: Context, userId: string, accountType: AccountType): Promise<User | null> {
        this.log.trace(`${ctx.traceId} choose account type ${userId} ${accountType}`);
        const result = await this.database.query<UserRow>(
            `UPDATE user_account
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

    async saveBasic(ctx: Context, userId: string, input: BasicWrite, workProfileId: string): Promise<User | null> {
        this.log.trace(`${ctx.traceId} save basic profile ${userId}`);
        return this.database.transaction(async (query) => {
            const updated = await query<UserRow>(
                `UPDATE user_account
                 SET phone = $2,
                     status = CASE WHEN status = 'basic' THEN 'setup' ELSE status END,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND status IN ('basic', 'media', 'review', 'admin-review')
                 RETURNING ${userColumns}`,
                [userId, input.phone],
            );
            const row = updated.rows[0];
            if (!row) {
                return null;
            }

            const existing = await query<{ id: string | null }>(
                `SELECT viewing_work_profile_id AS id FROM user_account WHERE id = $1`,
                [userId],
            );
            const existingId = existing.rows[0]?.id;
            if (existingId) {
                await query(
                    `UPDATE user_work_profile
                     SET bio = $2,
                         title = $3,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [existingId, input.bio, input.title],
                );
            } else {
                // Bio and title are collected before setup. union_status is required, and setup replaces this placeholder.
                await query(
                    `INSERT INTO user_work_profile (id, user_account_id, union_status, flat_fee, bio, title, status)
                     VALUES ($1, $2, 'either', false, $3, $4, 'draft')`,
                    [workProfileId, userId, input.bio, input.title],
                );
                await query(
                    `UPDATE user_account
                     SET viewing_work_profile_id = $2,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [userId, workProfileId],
                );
            }

            return UserSchema.parse(row);
        });
    }
    
    async savePhoto(ctx: Context, userId: string, photo: string): Promise<User | null> {
        this.log.trace(`${ctx.traceId} save profile photo ${userId}`);
        const result = await this.database.query<UserRow>(
            `UPDATE user_account
             SET photo = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status IN ('basic', 'media', 'review', 'admin-review')
             RETURNING ${userColumns}`,
            [userId, photo],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }

    async completeSetup(ctx: Context, input: SetupWrite): Promise<User | null> {
        const userId = input.user_account_id;
        this.log.trace(`${ctx.traceId} complete setup ${userId}`);
        if (input.locales.some((locale) => locale.user_account_id !== userId)) {
            throw new Error('Locale does not belong to the account.');
        }

        return this.database.transaction(async (query) => {
            const locked = await query<{ id: string }>(
                `SELECT id
                 FROM user_account
                 WHERE id = $1 AND status IN ('setup', 'media', 'review', 'admin-review')
                 FOR UPDATE`,
                [userId],
            );
            if (!locked.rows[0]) {
                return null;
            }

            const existingRate = await query<{ id: string | null }>(
                `SELECT viewing_work_profile_id AS id FROM user_account WHERE id = $1`,
                [userId],
            );
            let rateId = existingRate.rows[0]?.id ?? null;
            if (rateId) {
                await query(
                    `UPDATE user_work_profile
                     SET day_rate = $2,
                         currency_id = $3,
                         union_status = $4,
                         flat_fee = $5,
                         discipline_id = $6,
                         position_id = $7,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [
                        rateId,
                        input.day_rate,
                        input.currency_id,
                        input.union_status,
                        input.flat_fee,
                        input.discipline_id,
                        input.position_id,
                    ],
                );
            } else {
                rateId = input.rate_id;
                await query(
                    `INSERT INTO user_work_profile (
                         id, user_account_id, day_rate, currency_id, union_status, flat_fee,
                         discipline_id, position_id, status
                     )
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')`,
                    [
                        rateId,
                        userId,
                        input.day_rate,
                        input.currency_id,
                        input.union_status,
                        input.flat_fee,
                        input.discipline_id,
                        input.position_id,
                    ],
                );
                await query(
                    `UPDATE user_account
                     SET viewing_work_profile_id = $2,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [userId, rateId],
                );
            }

            await query(
                `DELETE FROM user_locale
                 WHERE user_work_profile_id = $1`,
                [rateId],
            );
            for (const locale of input.locales) {
                await query(
                    `INSERT INTO user_locale (id, user_account_id, production_city_id, home_city, user_work_profile_id)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [locale.id, locale.user_account_id, locale.production_city_id, locale.home_city, rateId],
                );
            }

            const updated = await query<UserRow>(
                `UPDATE user_account
                 SET status = CASE WHEN status = 'setup' THEN 'experience' ELSE status END,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND status IN ('setup', 'media', 'review', 'admin-review')
                 RETURNING ${userColumns}`,
                [userId],
            );
            const row = updated.rows[0];
            return row ? UserSchema.parse(row) : null;
        });
    }

    async returnToStep(ctx: Context, userId: string, target: UserStatus, from: UserStatus): Promise<User | null> {
        this.log.trace(`${ctx.traceId} return to step ${userId} ${target}`);
        const result = await this.database.query<UserRow>(
            `UPDATE user_account
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
                 FROM user_account
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
                 WHERE id = (SELECT viewing_work_profile_id FROM user_account WHERE id = $1)`,
                [userId, stats.projects_completed, stats.years_in_business, stats.response_time_hours],
            );
            if ((rates.rowCount ?? 0) === 0) {
                return { outcome: 'missing-profile' };
            }

            const updated = await query<UserRow>(
                `UPDATE user_account
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
            `UPDATE user_account
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
                 FROM user_account
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
                 WHERE user_work_profile_id = (SELECT viewing_work_profile_id FROM user_account WHERE id = $1)`,
                [userId],
            );
            if (Number(counted.rows[0]?.count ?? 0) < 2) {
                return { status: 'incomplete' };
            }

            await query(
                `UPDATE user_work_profile
                 SET status = 'admin-review',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = (SELECT viewing_work_profile_id FROM user_account WHERE id = $1)`,
                [userId],
            );
            const updated = await query<UserRow>(
                `UPDATE user_account
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

    async startWorkProfile(ctx: Context, userId: string, workProfileId: string): Promise<User | null> {
        this.log.trace(`${ctx.traceId} start another user_work_profile ${userId}`);
        return this.database.transaction(async (query) => {
            const locked = await query<{ status: string }>(
                `SELECT status FROM user_account WHERE id = $1 FOR UPDATE`,
                [userId],
            );
            if (locked.rows[0]?.status !== 'live') {
                return null;
            }

            await query(
                `INSERT INTO user_work_profile (id, user_account_id, union_status, flat_fee, status)
                 VALUES ($1, $2, 'either', false, 'draft')`,
                [workProfileId, userId],
            );
            const updated = await query<UserRow>(
                `UPDATE user_account
                 SET status = 'basic',
                     viewing_work_profile_id = $2,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND status = 'live'
                 RETURNING ${userColumns}`,
                [userId, workProfileId],
            );
            const row = updated.rows[0];
            return row ? UserSchema.parse(row) : null;
        });
    }

    async viewWorkProfile(ctx: Context, userId: string, workProfileId: string): Promise<User | null> {
        this.log.trace(`${ctx.traceId} view user_work_profile ${userId} ${workProfileId}`);
        const result = await this.database.query<UserRow>(
            `UPDATE user_account
             SET viewing_work_profile_id = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
               AND status = 'live'
               AND EXISTS (
                   SELECT 1
                   FROM user_work_profile
                   WHERE id = $2
                     AND user_account_id = $1
                     AND status = 'live'
               )
             RETURNING ${userColumns}`,
            [userId, workProfileId],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
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
    user_account_id: string;
    discipline_id: string;
    position_id: string;
    day_rate: number;
    currency_id: string;
    union_status: UnionStatus;
    flat_fee: boolean;
    rate_id: string;
    locales: UserLocale[];
};

const binaryKey = /^[0-9A-HJKMNP-TV-Z]{26}$/;

function storedBinaryIds(
    photo: string | null,
    media: Array<{ ref: string; thumbnail: string | null; media_type: string }>,
): string[] {
    const ids = new Set<string>();
    if (photo && binaryKey.test(photo)) {
        ids.add(photo);
    }
    for (const item of media) {
        if (item.thumbnail && binaryKey.test(item.thumbnail)) {
            ids.add(item.thumbnail);
        }
        if ((item.media_type === 'upload' || item.media_type === 'photo') && binaryKey.test(item.ref)) {
            ids.add(item.ref);
        }
    }
    return [...ids];
}

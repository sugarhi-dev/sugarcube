import { Database, Repository, type Context } from '@sugarcube/server-core';
import {
    ProfileUnavailabilitySchema,
    UserAvailabilitySchema,
    type ProfileUnavailability,
    type UserAvailability,
} from '../entities/userAvailability.js';
import { viewingProfile } from './viewingProfile.js';

type UserAvailabilityRow = {
    id: string;
    user_account_id: string;
    from_date: string;
    to_date: string;
    code: UserAvailability['code'];
};

type ProfileUnavailabilityRow = {
    id: string;
    from_date: string;
    to_date: string;
    work_profile_id: string;
    title: string | null;
    position: string | null;
    city: string | null;
    code: UserAvailability['code'];
};

const availabilityColumns = `id, user_account_id,
    to_char(from_date, 'YYYY-MM-DD') AS from_date,
    to_char(to_date, 'YYYY-MM-DD') AS to_date,
    code`;

export class UserAvailabilityRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listUserAvailability(ctx: Context, userAccountId: string): Promise<UserAvailability[]> {
        this.log.trace(`${ctx.traceId} select user_availability ${userAccountId}`);
        const result = await this.database.query<UserAvailabilityRow>(
            `SELECT ${availabilityColumns}
             FROM user_availability
             WHERE user_account_id = $1 AND ${viewingProfile('$1')}
             ORDER BY from_date, to_date, id`,
            [userAccountId],
        );
        return result.rows.map((row) => UserAvailabilitySchema.parse(row));
    }

    async listProfileUnavailability(ctx: Context, userAccountId: string): Promise<ProfileUnavailability[]> {
        this.log.trace(`${ctx.traceId} select user_availability profiles ${userAccountId}`);
        const result = await this.database.query<ProfileUnavailabilityRow>(
            `SELECT availability.id,
                    to_char(availability.from_date, 'YYYY-MM-DD') AS from_date,
                    to_char(availability.to_date, 'YYYY-MM-DD') AS to_date,
                    work.id AS work_profile_id,
                    work.title,
                    position.name AS position,
                    city.name AS city,
                    availability.code
             FROM user_availability availability
             JOIN user_work_profile work
                ON work.id = availability.user_work_profile_id
             LEFT JOIN positions position ON position.id = work.position_id
             LEFT JOIN user_locale locale
                ON locale.user_work_profile_id = work.id AND locale.home_city
             LEFT JOIN production_cities city ON city.id = locale.production_city_id
             WHERE availability.user_account_id = $1
               AND work.user_account_id = $1
             ORDER BY availability.from_date, availability.to_date, work.created_at, availability.id`,
            [userAccountId],
        );
        return result.rows.map((row) => ProfileUnavailabilitySchema.parse(row));
    }

    async replaceUnavailable(
        ctx: Context,
        userAccountId: string,
        ranges: Array<Pick<UserAvailability, 'id' | 'from_date' | 'to_date'>>,
    ): Promise<UserAvailability[]> {
        this.log.trace(`${ctx.traceId} replace user_availability ${userAccountId}`);
        return this.database.transaction(async (query) => {
            await query(
                `SELECT id FROM user_account WHERE id = $1 FOR UPDATE`,
                [userAccountId],
            );
            await query(
                `DELETE FROM user_availability
                 WHERE user_account_id = $1 AND code = 'unavailable' AND ${viewingProfile('$1')}`,
                [userAccountId],
            );
            for (const range of ranges) {
                await query(
                    `INSERT INTO user_availability (id, user_account_id, from_date, to_date, code, user_work_profile_id)
                     VALUES ($1, $2, $3, $4, 'unavailable', (SELECT viewing_work_profile_id FROM user_account WHERE id = $2::varchar))`,
                    [range.id, userAccountId, range.from_date, range.to_date],
                );
            }
            const listed = await query<UserAvailabilityRow>(
                `SELECT ${availabilityColumns}
                 FROM user_availability
                 WHERE user_account_id = $1 AND ${viewingProfile('$1')}
                 ORDER BY from_date, to_date, id`,
                [userAccountId],
            );
            return listed.rows.map((row) => UserAvailabilitySchema.parse(row));
        });
    }

    async listWorkProfileAvailability(
        ctx: Context,
        userAccountId: string,
        workProfileId: string,
    ): Promise<UserAvailability[] | null> {
        this.log.trace(`${ctx.traceId} select user_availability profile ${workProfileId}`);
        const owned = await this.database.query<{ id: string }>(
            `SELECT id
             FROM user_work_profile
             WHERE id = $2 AND user_account_id = $1`,
            [userAccountId, workProfileId],
        );
        if (!owned.rows[0]) {
            return null;
        }
        const result = await this.database.query<UserAvailabilityRow>(
            `SELECT ${availabilityColumns}
             FROM user_availability
             WHERE user_account_id = $1 AND user_work_profile_id = $2
             ORDER BY from_date, to_date, id`,
            [userAccountId, workProfileId],
        );
        return result.rows.map((row) => UserAvailabilitySchema.parse(row));
    }

    async replaceProfileUnavailable(
        ctx: Context,
        userAccountId: string,
        workProfileId: string,
        ranges: Array<Pick<UserAvailability, 'id' | 'from_date' | 'to_date'>>,
    ): Promise<UserAvailability[] | null> {
        this.log.trace(`${ctx.traceId} replace user_availability profile ${workProfileId}`);
        return this.database.transaction(async (query) => {
            const owned = await query<{ id: string }>(
                `SELECT id
                 FROM user_work_profile
                 WHERE id = $2 AND user_account_id = $1
                 FOR UPDATE`,
                [userAccountId, workProfileId],
            );
            if (!owned.rows[0]) {
                return null;
            }
            await query(
                `DELETE FROM user_availability
                 WHERE user_account_id = $1 AND user_work_profile_id = $2 AND code = 'unavailable'`,
                [userAccountId, workProfileId],
            );
            for (const range of ranges) {
                await query(
                    `INSERT INTO user_availability (id, user_account_id, from_date, to_date, code, user_work_profile_id)
                     VALUES ($1, $2, $3, $4, 'unavailable', $5)`,
                    [range.id, userAccountId, range.from_date, range.to_date, workProfileId],
                );
            }
            const listed = await query<UserAvailabilityRow>(
                `SELECT ${availabilityColumns}
                 FROM user_availability
                 WHERE user_account_id = $1 AND user_work_profile_id = $2
                 ORDER BY from_date, to_date, id`,
                [userAccountId, workProfileId],
            );
            return listed.rows.map((row) => UserAvailabilitySchema.parse(row));
        });
    }
}

import { Database, Repository, type Context } from '@sugarcube/server-core';
import { UserAvailabilitySchema, type UserAvailability } from '../entities/userAvailability.js';

type UserAvailabilityRow = {
    id: string;
    user_account_id: string;
    from_date: string;
    to_date: string;
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
             WHERE user_account_id = $1
             ORDER BY from_date, to_date, id`,
            [userAccountId],
        );
        return result.rows.map((row) => UserAvailabilitySchema.parse(row));
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
                 WHERE user_account_id = $1 AND code = 'unavailable'`,
                [userAccountId],
            );
            for (const range of ranges) {
                await query(
                    `INSERT INTO user_availability (id, user_account_id, from_date, to_date, code)
                     VALUES ($1, $2, $3, $4, 'unavailable')`,
                    [range.id, userAccountId, range.from_date, range.to_date],
                );
            }
            const listed = await query<UserAvailabilityRow>(
                `SELECT ${availabilityColumns}
                 FROM user_availability
                 WHERE user_account_id = $1
                 ORDER BY from_date, to_date, id`,
                [userAccountId],
            );
            return listed.rows.map((row) => UserAvailabilitySchema.parse(row));
        });
    }
}

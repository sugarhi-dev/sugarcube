import { Database, Repository, type Context } from '@sugarcube/server-core';
import { UserSettingSchema, type UserSetting } from '../entities/userSetting.js';

const userSettingColumns = 'id, user_account_id, name, value';

type UserSettingRow = {
    id: string;
    user_account_id: string;
    name: string;
    value: string;
};

export class UserSettingsRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listUserSettings(ctx: Context, userAccountId: string): Promise<UserSetting[]> {
        this.log.trace(`${ctx.traceId} select user_settings ${userAccountId}`);
        const result = await this.database.query<UserSettingRow>(
            `SELECT ${userSettingColumns}
             FROM user_settings
             WHERE user_account_id = $1
             ORDER BY name`,
            [userAccountId],
        );
        return result.rows.map((row) => UserSettingSchema.parse(row));
    }

    async replaceUserSettings(ctx: Context, userAccountId: string, settings: UserSetting[]): Promise<UserSetting[]> {
        this.log.trace(`${ctx.traceId} replace user_settings ${userAccountId}`);
        return this.database.transaction(async (query) => {
            await query(
                `SELECT id FROM user_account WHERE id = $1 FOR UPDATE`,
                [userAccountId],
            );
            await query(
                `DELETE FROM user_settings
                 WHERE user_account_id = $1
                   AND NOT (name = ANY($2::varchar[]))`,
                [userAccountId, settings.map((row) => row.name)],
            );
            for (const setting of settings) {
                await query(
                    `INSERT INTO user_settings (id, user_account_id, name, value)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (user_account_id, name) DO UPDATE
                     SET value = EXCLUDED.value,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE user_settings.value IS DISTINCT FROM EXCLUDED.value`,
                    [setting.id, setting.user_account_id, setting.name, setting.value],
                );
            }
            const result = await query<UserSettingRow>(
                `SELECT ${userSettingColumns}
                 FROM user_settings
                 WHERE user_account_id = $1
                 ORDER BY name`,
                [userAccountId],
            );
            return result.rows.map((row) => UserSettingSchema.parse(row));
        });
    }
}

import { Context, Logic } from '@sugarcube/server-core';
import { ulid } from 'ulidx';
import {
    UserSettingSchema,
    notificationSettingNames,
    type UserSetting,
    type UserSettingName,
} from '../entities/userSetting.js';
import { UserSettingsRepo } from '../repositories/userSettingsRepo.js';
import { constraintFailure } from './pgError.js';

export type UserSettingWrite = {
    name: UserSettingName;
    value: string;
};

const notificationNames = new Set<string>(notificationSettingNames);

const settingsConstraints = {
    user_settings_user_account_id_fkey: { statusCode: 404, message: 'Profile not found.' },
    user_settings_user_name_key: { statusCode: 409, message: 'That setting is already saved.' },
    user_settings_name_check: { statusCode: 400, message: 'Setting name is not allowed.' },
    user_settings_value_check: { statusCode: 400, message: 'Setting value is not allowed.' },
};

export class UserSettingsLogic extends Logic {
    private readonly userSettingsRepo: UserSettingsRepo;

    constructor(userSettingsRepo: UserSettingsRepo) {
        super();
        this.userSettingsRepo = userSettingsRepo;
    }

    listUserSettings(ctx: Context, userAccountId: string): Promise<UserSetting[]> {
        return this.userSettingsRepo.listUserSettings(ctx, userAccountId);
    }

    async saveUserSettings(
        ctx: Context,
        userAccountId: string,
        input: UserSettingWrite[],
    ): Promise<UserSetting[] | null> {
        const seen = new Set<string>();
        for (const row of input) {
            if (seen.has(row.name)) {
                ctx.error('Each setting can only be saved once.', 400);
                return null;
            }
            seen.add(row.name);
        }

        const settings = input.map((row) => UserSettingSchema.parse({
            id: ulid(),
            user_account_id: userAccountId,
            name: row.name,
            value: row.value,
        }));
        for (const row of settings) {
            if (notificationNames.has(row.name) && row.value !== 'true' && row.value !== 'false') {
                ctx.error('Notification settings must be true or false.', 400);
                return null;
            }
        }

        try {
            return await this.userSettingsRepo.replaceUserSettings(ctx, userAccountId, settings);
        } catch (error) {
            const failure = constraintFailure(error, settingsConstraints);
            if (!failure) {
                throw error;
            }
            ctx.error(failure.message, failure.statusCode);
            return null;
        }
    }
}

import { UserSettingSchema, type UserSetting, type UserSettingName } from '@sugarcube/schema';
import { apiJson } from './http.ts';
import { parseResponseList } from './parse.ts';

export type { UserSetting, UserSettingName };

export type UserSettingWrite = {
    name: UserSettingName;
    value: string;
};

export async function listSettings(accessToken: string): Promise<UserSetting[]> {
    const body = await apiJson(accessToken, '/api/me/settings');
    return parseResponseList(UserSettingSchema, body, 'Settings response was not valid.');
}

export async function saveSettings(accessToken: string, settings: UserSettingWrite[]): Promise<UserSetting[]> {
    const body = await apiJson(accessToken, '/api/me/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
    });
    return parseResponseList(UserSettingSchema, body, 'Settings response was not valid.');
}

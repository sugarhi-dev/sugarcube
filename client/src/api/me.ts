import { CurrentUserSchema, type AccountType, type CurrentUser, type UserStatus } from '@sugarcube/schema';
import { apiJson } from './http.ts';
import { parseResponse } from './parse.ts';

export type { AccountType, CurrentUser, UserStatus };

export type UnionStatus = 'union' | 'non_union' | 'either';

export type SetupCity = {
    production_city_id: string;
    home_city: boolean;
};

export type SetupProfileInput = {
    phone: string;
    discipline_id: string;
    position_id: string;
    day_rate: number;
    currency_id: string;
    union_status: UnionStatus;
    flat_fee: boolean;
    cities: SetupCity[];
};

export function getMe(accessToken: string): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me');
}

export function chooseAccountType(accessToken: string, accountType: AccountType): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/account-type', {
        method: 'PUT',
        body: JSON.stringify({ account_type: accountType }),
    });
}

export function saveSetup(accessToken: string, input: SetupProfileInput): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/setup', {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

export function completeExperience(accessToken: string): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/experience', { method: 'PUT' });
}

async function readUser(accessToken: string, path: string, init?: RequestInit): Promise<CurrentUser> {
    const body = await apiJson(accessToken, path, init);
    return parseResponse(CurrentUserSchema, body, 'Profile response was not valid.');
}

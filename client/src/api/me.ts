import { ApiError, apiJson } from './http.ts';

export type AccountType = 'client' | 'crew';

export type UserStatus = 'new' | 'setup' | 'experience' | 'media' | 'review' | 'live' | 'invisible';

export type CurrentUser = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    status: UserStatus;
    account_type: AccountType | null;
};

const statuses = new Set<UserStatus>(['new', 'setup', 'experience', 'media', 'review', 'live', 'invisible']);

export function getMe(accessToken: string): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me');
}

export function chooseAccountType(accessToken: string, accountType: AccountType): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/account-type', {
        method: 'PUT',
        body: JSON.stringify({ account_type: accountType }),
    });
}

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

export function saveSetup(accessToken: string, input: SetupProfileInput): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/setup', {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

async function readUser(accessToken: string, path: string, init?: RequestInit): Promise<CurrentUser> {
    const body = await apiJson(accessToken, path, init);
    if (!isCurrentUser(body)) {
        throw new ApiError(502, 'Profile response was not valid.');
    }
    return body;
}

function isCurrentUser(value: unknown): value is CurrentUser {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const user = value as Record<string, unknown>;
    return typeof user.id === 'string'
        && typeof user.first_name === 'string'
        && typeof user.last_name === 'string'
        && typeof user.email === 'string'
        && (user.phone === null || typeof user.phone === 'string')
        && isStatus(user.status)
        && (user.account_type === null || user.account_type === 'client' || user.account_type === 'crew');
}

function isStatus(value: unknown): value is UserStatus {
    return typeof value === 'string' && statuses.has(value as UserStatus);
}

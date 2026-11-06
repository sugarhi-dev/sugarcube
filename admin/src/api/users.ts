import { apiBase } from '../auth/config.ts';

export type AdminUser = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    status: string;
    account_type: string | null;
    created_at: string;
    updated_at: string;
};

export type DirectoryUser = AdminUser & {
    discipline: string | null;
    city: string | null;
    profile_count: number;
    photo_url: string | null;
};

export async function listUsers(accessToken: string): Promise<DirectoryUser[]> {
    const response = await adminFetch(accessToken, '/api/admin/users');
    if (!response.ok) {
        throw new Error(await readError(response, 'Could not load users'));
    }

    const body: unknown = await readJson(response);
    if (!Array.isArray(body) || !body.every(isDirectoryUser)) {
        throw new Error('Users response was not valid.');
    }

    return body;
}

export type Approval = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    account_type: string | null;
    position: string | null;
    discipline: string | null;
    city: string | null;
    day_rate: number | null;
    currency_code: string | null;
    union_status: 'union' | 'non_union' | 'either' | null;
    credit_count: number;
    media_count: number;
    updated_at: string;
    photo_url: string | null;
};

export async function listApprovals(accessToken: string): Promise<Approval[]> {
    const response = await adminFetch(accessToken, '/api/admin/approvals');
    if (!response.ok) {
        throw new Error(await readError(response, 'Could not load approvals'));
    }

    const body: unknown = await readJson(response);
    if (!Array.isArray(body) || !body.every(isApproval)) {
        throw new Error('Approvals response was not valid.');
    }

    return body;
}

export async function requestChanges(accessToken: string, id: string, message: string): Promise<AdminUser> {
    const response = await adminFetch(accessToken, `/api/admin/users/${encodeURIComponent(id)}/request-changes`, 'POST', { message });
    if (!response.ok) {
        throw new Error(await readError(response, 'Could not request changes'));
    }

    const body: unknown = await readJson(response);
    if (!isAdminUser(body)) {
        throw new Error('Request changes response was not valid.');
    }

    return body;
}

export async function backToReview(accessToken: string, id: string): Promise<AdminUser> {
    const response = await adminFetch(accessToken, `/api/admin/users/${encodeURIComponent(id)}/back-to-review`, 'POST');
    if (!response.ok) {
        throw new Error(await readError(response, 'Could not move this user back to review'));
    }

    const body: unknown = await readJson(response);
    if (!isAdminUser(body)) {
        throw new Error('Back to review response was not valid.');
    }

    return body;
}

export async function approveUser(accessToken: string, id: string): Promise<AdminUser> {
    const response = await adminFetch(accessToken, `/api/admin/users/${encodeURIComponent(id)}/approve`, 'POST');
    if (!response.ok) {
        throw new Error(await readError(response, 'Could not approve this user'));
    }

    const body: unknown = await readJson(response);
    if (!isAdminUser(body)) {
        throw new Error('Approve response was not valid.');
    }

    return body;
}

async function adminFetch(accessToken: string, path: string, method = 'GET', body?: unknown): Promise<Response> {
    try {
        return await fetch(`${apiBase()}${path}`, {
            method,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${accessToken}`,
                ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new Error('Could not reach the Sugarcube API.');
    }
}

async function readJson(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        throw new Error('The server response was not valid JSON.');
    }
}

function isDirectoryUser(value: unknown): value is DirectoryUser {
    if (!isAdminUser(value)) {
        return false;
    }
    const row = value as unknown as Record<string, unknown>;
    return (row.discipline === null || typeof row.discipline === 'string')
        && (row.city === null || typeof row.city === 'string')
        && typeof row.profile_count === 'number'
        && (row.photo_url === null || (typeof row.photo_url === 'string' && row.photo_url.startsWith('/content/')));
}

function isApproval(value: unknown): value is Approval {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const row = value as Record<string, unknown>;
    return typeof row.id === 'string'
        && typeof row.first_name === 'string'
        && typeof row.last_name === 'string'
        && typeof row.email === 'string'
        && typeof row.status === 'string'
        && (row.account_type === null || typeof row.account_type === 'string')
        && (row.position === null || typeof row.position === 'string')
        && (row.discipline === null || typeof row.discipline === 'string')
        && (row.city === null || typeof row.city === 'string')
        && (row.day_rate === null || typeof row.day_rate === 'number')
        && (row.currency_code === null || typeof row.currency_code === 'string')
        && (row.union_status === null || row.union_status === 'union' || row.union_status === 'non_union' || row.union_status === 'either')
        && typeof row.credit_count === 'number'
        && typeof row.media_count === 'number'
        && typeof row.updated_at === 'string'
        && (row.photo_url === null || (typeof row.photo_url === 'string' && row.photo_url.startsWith('/content/')));
}

function isAdminUser(value: unknown): value is AdminUser {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const user = value as Record<string, unknown>;
    return typeof user.id === 'string'
        && typeof user.first_name === 'string'
        && typeof user.last_name === 'string'
        && typeof user.email === 'string'
        && (user.phone === null || typeof user.phone === 'string')
        && typeof user.status === 'string'
        && (user.account_type === null || typeof user.account_type === 'string')
        && typeof user.created_at === 'string'
        && typeof user.updated_at === 'string';
}

async function readError(response: Response, action: string): Promise<string> {
    const fallback = `${action} (${response.status}).`;
    try {
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object') {
            return fallback;
        }

        const record = body as Record<string, unknown>;
        if (typeof record.error_message === 'string' && record.error_message) {
            return record.error_message;
        }
        if (typeof record.error === 'string' && record.error) {
            return record.error;
        }
    } catch {
        return fallback;
    }

    return fallback;
}

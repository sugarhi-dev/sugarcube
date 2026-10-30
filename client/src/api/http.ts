import { apiBase } from '../auth/config.ts';

export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export async function apiJson(accessToken: string, path: string, init?: RequestInit): Promise<unknown> {
    let response: Response;
    try {
        response = await fetch(`${apiBase()}${path}`, {
            ...init,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${accessToken}`,
                ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
                ...init?.headers,
            },
        });
    } catch {
        throw new ApiError(0, 'Could not reach the Sugarcube API.');
    }

    if (!response.ok) {
        throw new ApiError(response.status, await readError(response));
    }

    try {
        return await response.json() as unknown;
    } catch {
        throw new ApiError(response.status, 'The server response was not valid JSON.');
    }
}

async function readError(response: Response): Promise<string> {
    const fallback = `Request failed (${response.status}).`;
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

export async function apiBlob(accessToken: string, path: string): Promise<Blob> {
    let response: Response;
    try {
        response = await fetch(`${apiBase()}${path}`, {
            cache: 'no-store',
            headers: {
                Accept: 'image/jpeg, image/png',
                Authorization: `Bearer ${accessToken}`,
            },
        });
    } catch {
        throw new ApiError(0, 'Could not reach the Sugarcube API.');
    }

    if (!response.ok) {
        throw new ApiError(response.status, await readError(response));
    }

    return response.blob();
}

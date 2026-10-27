import { apiBase, oidcClientId, redirectUri } from '../auth/config.ts';
import type { Profile, Session } from '../auth/session.ts';

type TokenResponse = {
    access_token: string;
    id_token: string;
    refresh_token?: string;
    expires_in?: number;
};

const inflight = new Map<string, Promise<Session>>();

export function exchangeCode(code: string, sessionState: string): Promise<Session> {
    const existing = inflight.get(code);
    if (existing) {
        return existing;
    }

    const pending = requestSession(code, sessionState);
    inflight.set(code, pending);
    return pending;
}

async function requestSession(code: string, sessionState: string): Promise<Session> {
    let response: Response;
    try {
        response = await fetch(`${apiBase()}/api/auth/oidc/callback`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code,
                client_id: oidcClientId(),
                redirect_uri: redirectUri(),
                session_state: sessionState,
            }),
        });
    } catch {
        throw new Error('Could not reach the Sugarcube API.');
    }

    if (!response.ok) {
        throw new Error(await readError(response));
    }

    let body: unknown;
    try {
        body = await response.json();
    } catch {
        throw new Error('Sign-in response was not valid JSON.');
    }

    if (!isTokenResponse(body)) {
        throw new Error('Sign-in response did not include tokens.');
    }

    const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 300;
    return {
        accessToken: body.access_token,
        idToken: body.id_token,
        refreshToken: typeof body.refresh_token === 'string' ? body.refresh_token : null,
        expiresAt: Date.now() + expiresIn * 1000,
        profile: profileFromIdToken(body.id_token),
    };
}

function isTokenResponse(value: unknown): value is TokenResponse {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const record = value as Record<string, unknown>;
    return typeof record.access_token === 'string' && typeof record.id_token === 'string';
}

async function readError(response: Response): Promise<string> {
    const fallback = `Sign-in failed (${response.status}).`;
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

function profileFromIdToken(idToken: string): Profile {
    const claims = decodeJwtPayload(idToken);
    return {
        subject: readString(claims, 'sub'),
        email: readString(claims, 'email'),
        givenName: readString(claims, 'given_name'),
        familyName: readString(claims, 'family_name'),
    };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
    const payload = token.split('.')[1];
    if (!payload) {
        throw new Error('Identity token is missing a payload.');
    }

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Identity token payload is not an object.');
    }

    return parsed as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value : '';
}

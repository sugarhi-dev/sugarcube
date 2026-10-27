const storageKey = 'sugarcube.session';

export type Profile = {
    subject: string;
    email: string;
    givenName: string;
    familyName: string;
};

export type Session = {
    accessToken: string;
    idToken: string;
    refreshToken: string | null;
    expiresAt: number;
    profile: Profile;
};

function isProfile(value: unknown): value is Profile {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const profile = value as Record<string, unknown>;
    return typeof profile.subject === 'string'
        && typeof profile.email === 'string'
        && typeof profile.givenName === 'string'
        && typeof profile.familyName === 'string';
}

function isSession(value: unknown): value is Session {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const session = value as Record<string, unknown>;
    return typeof session.accessToken === 'string'
        && typeof session.idToken === 'string'
        && (session.refreshToken === null || typeof session.refreshToken === 'string')
        && typeof session.expiresAt === 'number'
        && isProfile(session.profile);
}

function isLiveJwt(token: string): boolean {
    const segments = token.split('.');
    const payload = segments[1];
    if (segments.length !== 3 || !payload || segments.some((segment) => segment.length === 0)) {
        return false;
    }

    try {
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
        if (!parsed || typeof parsed !== 'object') {
            return false;
        }

        const exp = (parsed as { exp?: unknown }).exp;
        return typeof exp === 'number' && exp * 1000 > Date.now();
    } catch {
        return false;
    }
}

export function loadSession(): Session | null {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!isSession(parsed) || parsed.expiresAt <= Date.now() || !isLiveJwt(parsed.accessToken)) {
            sessionStorage.removeItem(storageKey);
            return null;
        }
        return parsed;
    } catch {
        sessionStorage.removeItem(storageKey);
        return null;
    }
}

export function hasJwt(): boolean {
    return loadSession() !== null;
}

export function saveSession(session: Session): void {
    sessionStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearSession(): void {
    sessionStorage.removeItem(storageKey);
}

function trimTrailingSlash(value: string): string {
    return value.replace(/\/$/, '');
}

export function oidcIssuer(): string {
    return trimTrailingSlash(import.meta.env.VITE_KEYCLOAK_ISSUER || 'http://localhost/idp/realms/sugarcube');
}

export function oidcClientId(): string {
    return import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sugarcube';
}

export function redirectUri(): string {
    return new URL(`${import.meta.env.BASE_URL}auth/callback`, window.location.origin).toString();
}

export function apiBase(): string {
    return trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '');
}

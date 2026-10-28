import pg from 'pg';

export const devUser = {
    email: 'dev@sugarhi.tv',
    password: 'test123#',
    firstName: 'Dev',
    lastName: 'Sugarhi',
};

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://sugarcube:sugarcube@localhost:5432/sugarcube';
const keycloakBase = process.env.KEYCLOAK_BASE_URL ?? 'http://localhost/idp';
const keycloakRealm = 'sugarcube';
const keycloakAdminUser = process.env.KEYCLOAK_ADMIN ?? 'admin';
const keycloakAdminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';

export async function prepareDevUser(): Promise<void> {
    await flushAppProfiles();
    await replaceDevUser();
}

async function flushAppProfiles(): Promise<void> {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
        await client.query('TRUNCATE TABLE user_profile CASCADE');
    } finally {
        await client.end();
    }
}

async function replaceDevUser(): Promise<void> {
    const token = await adminToken();
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
    const listed = await keycloak(
        `/admin/realms/${keycloakRealm}/users?username=${encodeURIComponent(devUser.email)}&exact=true`,
        { headers },
    );
    const users = await readJson(listed);
    const existing = Array.isArray(users)
        ? users.find((user) => isUser(user) && user.username === devUser.email)
        : undefined;
    if (existing) {
        const removed = await keycloak(`/admin/realms/${keycloakRealm}/users/${existing.id}`, {
            method: 'DELETE',
            headers,
        });
        if (!removed.ok) {
            throw new Error(`Could not replace ${devUser.email}: Keycloak returned ${removed.status}.`);
        }
    }

    const created = await keycloak(`/admin/realms/${keycloakRealm}/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            username: devUser.email,
            email: devUser.email,
            firstName: devUser.firstName,
            lastName: devUser.lastName,
            enabled: true,
            emailVerified: true,
            credentials: [{ type: 'password', value: devUser.password, temporary: false }],
        }),
    });
    if (created.status !== 201) {
        throw new Error(`Could not create ${devUser.email}: Keycloak returned ${created.status}. ${await created.text()}`);
    }
}

async function adminToken(): Promise<string> {
    const response = await keycloak('/realms/master/protocol/openid-connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: 'admin-cli',
            username: keycloakAdminUser,
            password: keycloakAdminPassword,
            grant_type: 'password',
        }),
    });
    if (!response.ok) {
        throw new Error(`Keycloak admin login failed (${response.status}).`);
    }
    const body = await readJson(response);
    if (!isToken(body)) {
        throw new Error('Keycloak admin login did not return an access token.');
    }
    return body.access_token;
}

function keycloak(path: string, init: RequestInit): Promise<Response> {
    return fetch(`${keycloakBase}${path}`, init);
}

async function readJson(response: Response): Promise<unknown> {
    return response.json() as Promise<unknown>;
}

function isToken(value: unknown): value is { access_token: string } {
    return !!value && typeof value === 'object' && typeof (value as { access_token?: unknown }).access_token === 'string';
}

function isUser(value: unknown): value is { id: string; username: string } {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const user = value as { id?: unknown; username?: unknown };
    return typeof user.id === 'string' && typeof user.username === 'string';
}

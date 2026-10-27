import { oidcClientId, oidcIssuer, redirectUri } from './config.ts';

const stateKey = 'sugarcube.oidc.state';

export type CallbackResult = {
    code: string;
    sessionState: string;
};

const callbackResults = new Map<string, CallbackResult | Error>();

export function beginSignIn(): void {
    const state = crypto.randomUUID();
    sessionStorage.setItem(stateKey, state);

    const url = new URL(`${oidcIssuer()}/protocol/openid-connect/auth`);
    url.searchParams.set('client_id', oidcClientId());
    url.searchParams.set('redirect_uri', redirectUri());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('state', state);

    window.location.assign(url.toString());
}

export function readCallback(search: string): CallbackResult {
    const cached = callbackResults.get(search);
    if (cached instanceof Error) {
        throw cached;
    }
    if (cached) {
        return cached;
    }

    try {
        const result = parseCallback(search);
        callbackResults.set(search, result);
        return result;
    } catch (caught) {
        const error = caught instanceof Error ? caught : new Error('Sign-in failed.');
        callbackResults.set(search, error);
        throw error;
    }
}

function parseCallback(search: string): CallbackResult {
    const params = new URLSearchParams(search);
    const state = params.get('state');
    const expected = sessionStorage.getItem(stateKey);
    sessionStorage.removeItem(stateKey);

    if (!state || !expected || state !== expected) {
        throw new Error('Sign-in could not be verified. Start again from the sign-in page.');
    }

    const providerError = params.get('error_description') ?? params.get('error');
    if (providerError) {
        throw new Error(providerError);
    }

    const code = params.get('code');
    const sessionState = params.get('session_state');
    if (!code || !sessionState) {
        throw new Error('The identity provider did not return a complete sign-in response.');
    }

    return { code, sessionState };
}

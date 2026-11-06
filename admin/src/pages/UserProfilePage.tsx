import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { ConfigProvider, Result, Spin } from 'antd';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { getMe } from '../../../client/src/api/me.ts';
import type { Session as ClientSession } from '../../../client/src/auth/session.ts';
import { OnboardingReview } from '../../../client/src/pages/onboarding/OnboardingReview.tsx';
import { profileLoaded, profileReducer } from '../../../client/src/store/profileSlice.ts';
import { sessionReducer, sessionSaved } from '../../../client/src/store/sessionSlice.ts';
import { copyThatTheme } from '../../../client/src/theme.ts';
import '../../../client/src/index.css';
import type { Session } from '../auth/session.ts';
import { useFrameCrumbs } from '../components/Navigator.tsx';
import { useSession } from '../session/SessionProvider.tsx';

export type ProfileOrigin = 'users' | 'approvals';

export function openProfile(userId: string, from: ProfileOrigin): { pathname: string; options: { state: { from: ProfileOrigin } } } {
    return { pathname: `/users/${userId}`, options: { state: { from } } };
}

export function UserProfilePage() {
    const params = useParams();
    const userId = params.userId;
    const session = useSession();
    const origin = profileOrigin(useLocation().state);
    const setCrumbs = useFrameCrumbs();
    const store = useRef(createReviewStore()).current;
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);

    useEffect(() => {
        if (!session || !userId) {
            return;
        }

        const restore = rewriteMe(userId);
        let active = true;
        setReady(false);
        setError(null);
        setName(null);
        store.dispatch(sessionSaved(clientSession(session)));
        void getMe(session.accessToken, `/api/admin/users/${encodeURIComponent(userId)}`)
            .then((user) => {
                if (!active) {
                    return;
                }
                store.dispatch(profileLoaded({
                    user: { ...user, status: 'admin-review' },
                    forSubject: session.profile.subject,
                }));
                setName(profileName(user.first_name, user.last_name));
                setReady(true);
            })
            .catch((cause: unknown) => {
                if (active) {
                    setError(cause instanceof Error ? cause.message : 'Could not load this profile.');
                }
            });

        return () => {
            active = false;
            restore();
        };
    }, [session, store, userId]);

    useLayoutEffect(() => {
        const parent = origin === 'approvals'
            ? { title: 'Approvals', to: '/approvals' }
            : { title: 'Users', to: '/users' };
        setCrumbs([parent, { title: name ?? 'Profile' }]);
        return () => setCrumbs(null);
    }, [name, origin, setCrumbs]);

    return (
        <>
            {error ? (
                <Result status="error" title="Could not load this profile" subTitle={error} />
            ) : !ready ? (
                <Spin size="large" description="Loading profile…" />
            ) : (
                <div className="admin-profile">
                    <ConfigProvider theme={copyThatTheme}>
                        <Provider store={store}>
                            <OnboardingReview />
                        </Provider>
                    </ConfigProvider>
                </div>
            )}
        </>
    );
}

function profileName(first: string, last: string): string | null {
    const name = [first, last].map((part) => part.trim()).filter((part) => part.length > 0).join(' ');
    return name.length > 0 ? name : null;
}

function profileOrigin(state: unknown): ProfileOrigin {
    if (state && typeof state === 'object' && 'from' in state && state.from === 'approvals') {
        return 'approvals';
    }
    return 'users';
}

function createReviewStore() {
    return configureStore({
        reducer: {
            session: sessionReducer,
            profile: profileReducer,
        },
    });
}

function clientSession(session: Session): ClientSession {
    return {
        accessToken: session.accessToken,
        idToken: session.idToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        profile: { ...session.profile },
    };
}

function rewriteMe(userId: string): () => void {
    const original = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const url = requestUrl(input);
        const next = remapMe(url, userId);
        if (next === url) {
            return original(input, init);
        }
        if (typeof input === 'string' || input instanceof URL) {
            return original(next, init);
        }
        return original(new Request(next, input), init);
    };
    return () => {
        window.fetch = original;
    };
}

function requestUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') {
        return input;
    }
    if (input instanceof URL) {
        return input.toString();
    }
    return input.url;
}

function remapMe(url: string, userId: string): string {
    const marker = '/api/me';
    const index = url.indexOf(marker);
    if (index < 0) {
        return url;
    }
    const rest = url.slice(index + marker.length);
    if (rest.length > 0 && !rest.startsWith('/') && !rest.startsWith('?')) {
        return url;
    }
    return `${url.slice(0, index)}/api/admin/users/${encodeURIComponent(userId)}${rest}`;
}

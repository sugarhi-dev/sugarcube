import { Button, Result, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { ApiError } from '../api/http.ts';
import { getMe } from '../api/me.ts';
import { onboardingAccountTypePath } from '../pages/onboarding/OnboardingAccountType.tsx';
import { onboardingProfilePath } from '../pages/onboarding/OnboardingProfile.tsx';
import { useAppDispatch, useAppSelector, useSession } from '../store/hooks.ts';
import { profileFailed, profileLoaded, profileRequested } from '../store/profileSlice.ts';
import { sessionCleared } from '../store/sessionSlice.ts';
import { Centered } from './Centered.tsx';

export function SignedIn() {
    const session = useSession();
    const dispatch = useAppDispatch();
    const profile = useAppSelector((state) => state.profile);
    const location = useLocation();
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!session) {
            return;
        }

        const subject = session.profile.subject;
        const token = session.accessToken;
        let active = true;
        dispatch(profileRequested(subject));

        getMe(token).then(
            (user) => {
                if (active) {
                    dispatch(profileLoaded({ user, forSubject: subject }));
                }
            },
            (error: unknown) => {
                if (!active) {
                    return;
                }
                if (error instanceof ApiError && error.status === 401) {
                    dispatch(sessionCleared());
                    return;
                }
                dispatch(profileFailed({
                    forSubject: subject,
                    error: error instanceof Error ? error.message : 'Could not load your profile.',
                }));
            },
        );

        return () => {
            active = false;
        };
    }, [attempt, dispatch, session]);

    if (!session) {
        return null;
    }

    const subject = session.profile.subject;
    const failed = profile.status === 'error' && profile.forSubject === subject;
    const user = profile.status === 'ready' && profile.forSubject === subject ? profile.user : null;

    if (failed) {
        return (
            <Centered>
                <Result
                    status="error"
                    title="Could not load your profile"
                    subTitle={profile.error}
                    extra={(
                        <Button type="primary" onClick={() => setAttempt((value) => value + 1)}>
                            Try again
                        </Button>
                    )}
                />
            </Centered>
        );
    }

    if (!user) {
        return <Spin size="large" description="Loading your profile…" fullscreen />;
    }

    const onAccountType = location.pathname === onboardingAccountTypePath;
    const onProfile = location.pathname === onboardingProfilePath;
    if (user.status === 'new' && !onAccountType) {
        return <Navigate to={onboardingAccountTypePath} replace />;
    }
    if (user.status === 'setup' && !onProfile) {
        return <Navigate to={onboardingProfilePath} replace />;
    }
    if (user.status !== 'new' && user.status !== 'setup' && (onAccountType || onProfile)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

import { Spin } from 'antd';
import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router';
import { beginSignIn } from '../auth/oidc.ts';
import { useSession } from '../store/hooks.ts';

export function SignInPage() {
    const started = useRef(false);
    const signedIn = useSession() !== null;

    useEffect(() => {
        document.title = 'Sign in — Sugarcube';
        if (signedIn || started.current) {
            return;
        }
        started.current = true;
        beginSignIn();
    }, [signedIn]);

    if (signedIn) {
        return <Navigate to="/" replace />;
    }

    return <Spin size="large" description="Redirecting to sign in…" fullscreen />;
}

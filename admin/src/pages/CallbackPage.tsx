import { Button, Result, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { exchangeCode } from '../api/auth.ts';
import { readCallback } from '../auth/oidc.ts';
import { Centered } from '../components/Centered.tsx';
import { useSessionActions } from '../session/SessionProvider.tsx';

export function CallbackPage() {
    const navigate = useNavigate();
    const { remember } = useSessionActions();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        document.title = 'Signing in — Sugarcube Admin';
    }, []);

    useEffect(() => {
        let active = true;
        const search = window.location.search;

        async function complete(): Promise<void> {
            try {
                const { code, sessionState } = readCallback(search);
                const session = await exchangeCode(code, sessionState);
                if (!active) {
                    return;
                }
                remember(session);
                navigate('/', { replace: true });
            } catch (caught) {
                if (!active) {
                    return;
                }
                document.title = 'Sign-in failed — Sugarcube Admin';
                setError(caught instanceof Error ? caught.message : 'Sign-in failed.');
            }
        }

        void complete();
        return () => {
            active = false;
        };
    }, [navigate, remember]);

    if (!error) {
        return <Spin size="large" description="Signing you in…" fullscreen />;
    }

    return (
        <Centered>
            <Result
                status="error"
                title="Sign-in failed"
                subTitle={error}
                extra={(
                    <Button type="primary" onClick={() => navigate('/sign-in')}>
                        Back to sign in
                    </Button>
                )}
            />
        </Centered>
    );
}

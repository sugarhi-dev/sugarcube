import { Typography } from 'antd';
import { useEffect } from 'react';
import { useSession } from '../session/SessionProvider.tsx';

export function DashboardPage() {
    const session = useSession();

    useEffect(() => {
        document.title = 'Dashboard — Sugarcube Admin';
    }, []);

    const name = [session?.profile.givenName, session?.profile.familyName].filter(Boolean).join(' ');

    return (
        <>
            <Typography.Title level={3}>{name ? `Hello, ${name}` : 'Dashboard'}</Typography.Title>
            {session?.profile.email ? (
                <Typography.Paragraph type="secondary">{session.profile.email}</Typography.Paragraph>
            ) : null}
        </>
    );
}

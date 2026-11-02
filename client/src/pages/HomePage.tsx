import { Card, Typography } from 'antd';
import { useEffect } from 'react';
import { Frame } from '../components/Frame.tsx';
import { useSession } from '../store/hooks.ts';

export function HomePage() {
    const session = useSession();

    useEffect(() => {
        document.title = 'Sugarcube';
    }, []);

    if (!session) {
        return null;
    }

    const name = [session.profile.givenName, session.profile.familyName].filter(Boolean).join(' ');

    return (
        <Frame>
            <Card style={{ maxWidth: 640 }}>
                <Typography.Title level={3}>
                    {name ? `Hello, ${name}` : 'Signed in'}
                </Typography.Title>
                {session.profile.email ? (
                    <Typography.Paragraph type="secondary">{session.profile.email}</Typography.Paragraph>
                ) : null}
            </Card>
        </Frame>
    );
}

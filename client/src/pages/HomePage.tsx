import { LogoutOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Layout, Typography } from 'antd';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { clearSession, loadSession } from '../auth/session.ts';

const { Header, Content } = Layout;

export function HomePage() {
    const navigate = useNavigate();
    const session = loadSession();

    useEffect(() => {
        document.title = 'Sugarcube';
    }, []);

    if (!session) {
        return null;
    }

    const name = [session.profile.givenName, session.profile.familyName].filter(Boolean).join(' ');

    function signOut(): void {
        clearSession();
        navigate('/sign-in', { replace: true });
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header>
                <Flex align="center" justify="space-between" style={{ height: '100%' }}>
                    <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
                        Sugarcube
                    </Typography.Title>
                    <Button icon={<LogoutOutlined />} onClick={signOut}>
                        Sign out
                    </Button>
                </Flex>
            </Header>
            <Content style={{ padding: 24 }}>
                <Card style={{ maxWidth: 640 }}>
                    <Typography.Title level={3}>
                        {name ? `Hello, ${name}` : 'Signed in'}
                    </Typography.Title>
                    {session.profile.email ? (
                        <Typography.Paragraph type="secondary">{session.profile.email}</Typography.Paragraph>
                    ) : null}
                </Card>
            </Content>
        </Layout>
    );
}

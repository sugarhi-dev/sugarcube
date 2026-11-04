import { DashboardOutlined, ProjectOutlined, TeamOutlined } from '@ant-design/icons';
import { Breadcrumb, Button, Layout, Menu, theme } from 'antd';
import type { MenuProps } from 'antd';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useSessionActions } from '../session/SessionProvider.tsx';

const { Content, Header, Sider } = Layout;

const items: MenuProps['items'] = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/users', icon: <TeamOutlined />, label: 'Users' },
    { key: '/projects', icon: <ProjectOutlined />, label: 'Projects' },
];

const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/users': 'Users',
    '/projects': 'Projects',
};

export function Navigator() {
    const navigate = useNavigate();
    const location = useLocation();
    const { forget } = useSessionActions();
    const [collapsed, setCollapsed] = useState(false);
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();
    const pageTitle = titles[location.pathname] ?? 'Admin';

    function signOut(): void {
        forget();
        navigate('/sign-in', { replace: true });
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
                <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6 }} />
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={items}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>
            <Layout>
                <Header style={{ padding: '0 16px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Button onClick={signOut}>Sign out</Button>
                </Header>
                <Content style={{ margin: '0 16px' }}>
                    <Breadcrumb style={{ margin: '16px 0' }} items={[{ title: 'Admin' }, { title: pageTitle }]} />
                    <div style={{ padding: 24, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG }}>
                        <Outlet />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}

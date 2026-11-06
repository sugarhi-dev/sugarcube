import {
    AppstoreOutlined,
    CheckCircleOutlined,
    CreditCardOutlined,
    CustomerServiceOutlined,
    FolderOpenOutlined,
    SettingOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { Breadcrumb, ConfigProvider, Dropdown } from 'antd';
import type { MenuProps, ThemeConfig } from 'antd';
import { createContext, useContext, useMemo, useState, type ReactElement } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useSession, useSessionActions } from '../session/SessionProvider.tsx';

type NavItem = {
    key: string | null;
    label: string;
    icon: ReactElement;
};

const nav: NavItem[] = [
    { key: '/', label: 'Overview', icon: <AppstoreOutlined /> },
    { key: '/users', label: 'Users', icon: <TeamOutlined /> },
    { key: '/approvals', label: 'Approvals', icon: <CheckCircleOutlined /> },
    { key: '/projects', label: 'Projects', icon: <FolderOpenOutlined /> },
    { key: null, label: 'Payments', icon: <CreditCardOutlined /> },
    { key: null, label: 'Stripe', icon: <StripeMark /> },
    { key: null, label: 'Support', icon: <CustomerServiceOutlined /> },
    { key: null, label: 'Settings', icon: <SettingOutlined /> },
];

const titles: Record<string, string> = {
    '/': 'Overview',
    '/users': 'Users',
    '/approvals': 'Approvals',
    '/projects': 'Projects',
};

export type FrameCrumb = {
    title: string;
    to?: string;
};

type FrameDetail = {
    detail: string | null;
    setDetail: (value: string | null) => void;
    setCrumbs: (value: FrameCrumb[] | null) => void;
};

const FrameDetailContext = createContext<FrameDetail | null>(null);

export function useFrameDetail(): (value: string | null) => void {
    return useContext(FrameDetailContext)?.setDetail ?? noop;
}

export function useFrameCrumbs(): (value: FrameCrumb[] | null) => void {
    return useContext(FrameDetailContext)?.setCrumbs ?? noopCrumbs;
}

function noop(): void {}

function noopCrumbs(_value: FrameCrumb[] | null): void {}

const crumbTheme: ThemeConfig = {
    components: {
        Breadcrumb: {
            fontSize: 22,
            itemColor: '#1c1c1c',
            lastItemColor: '#1c1c1c',
            linkColor: '#1c1c1c',
            linkHoverColor: '#e2186c',
            separatorColor: '#b7aea6',
        },
    },
};

export function Navigator() {
    const navigate = useNavigate();
    const location = useLocation();
    const session = useSession();
    const { forget } = useSessionActions();
    const [detail, setDetail] = useState<string | null>(null);
    const [crumbs, setCrumbs] = useState<FrameCrumb[] | null>(null);
    const frameDetail = useMemo(() => ({ detail, setDetail, setCrumbs }), [detail]);
    const section = location.pathname.startsWith('/users') ? '/users' : location.pathname;
    const pageTitle = titles[section] ?? 'Admin';
    const trail: FrameCrumb[] = crumbs && crumbs.length > 0
        ? crumbs
        : [{ title: detail ? `${pageTitle} — ${detail}` : pageTitle, to: section }];
    const name = [session?.profile.givenName, session?.profile.familyName].filter(Boolean).join(' ') || 'Admin';
    const mark = initials(session?.profile.givenName ?? '', session?.profile.familyName ?? '');
    const accountMenu: MenuProps['items'] = [{ key: 'sign-out', label: 'Sign out' }];

    function onAccount({ key }: { key: string }): void {
        if (key === 'sign-out') {
            forget();
            navigate('/sign-in', { replace: true });
        }
    }

    return (
        <FrameDetailContext.Provider value={frameDetail}>
            <div className="admin-shell">
                <aside className="admin-sider">
                    <div className="admin-brand">
                        <span className="admin-logo">COPY<span>THAT</span></span>
                        <span className="admin-badge">Admin</span>
                    </div>
                    <nav className="admin-nav" aria-label="Admin">
                        {nav.map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                className={item.key === section ? 'admin-nav-item is-on' : 'admin-nav-item'}
                                aria-current={item.key === section ? 'page' : undefined}
                                onClick={() => {
                                    if (item.key) {
                                        navigate(item.key);
                                    }
                                }}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </nav>
                    <p className="admin-sider-note">Limited Beta — admin use. All actions are audit-logged.</p>
                </aside>
                <div className="admin-main">
                    <header className="admin-top">
                        <ConfigProvider theme={crumbTheme}>
                            <Breadcrumb
                                className="admin-crumbs"
                                aria-label="Breadcrumb"
                                separator=">"
                                items={trail.map((crumb) => ({ title: crumb.title, href: crumb.to }))}
                                itemRender={(item, _params, routes) => {
                                    const current = routes[routes.length - 1] === item;
                                    if (typeof item.href === 'string' && item.href.length > 0) {
                                        return (
                                            <Link className="admin-crumb" to={item.href} aria-current={current ? 'page' : undefined}>
                                                {item.title}
                                            </Link>
                                        );
                                    }
                                    return <span className="admin-crumb is-current" aria-current="page">{item.title}</span>;
                                }}
                            />
                        </ConfigProvider>
                        <Dropdown menu={{ items: accountMenu, onClick: onAccount }} trigger={['click']} placement="bottomRight">
                            <button type="button" className="admin-account">
                                <span>{name} — Super Admin</span>
                                <span className="admin-avatar" aria-hidden="true">{mark}</span>
                            </button>
                        </Dropdown>
                    </header>
                    <div className="admin-content">
                        <Outlet />
                    </div>
                </div>
            </div>
        </FrameDetailContext.Provider>
    );
}

function StripeMark() {
    return (
        <svg className="admin-stripe" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13.2 9.5c0-.7.6-1 1.5-1 1.3 0 2.8.4 4.1 1.1V6.3A11 11 0 0 0 14.7 5C11.8 5 10 6.4 10 8.9c0 4 5.5 3.4 5.5 5.1 0 .8-.7 1.1-1.7 1.1-1.4 0-3.3-.6-4.7-1.4v3.3c1.6.7 3.2 1 4.7 1 3 0 5-1.5 5-4-.1-4.3-5.6-3.6-5.6-5.5z" />
        </svg>
    );
}

function initials(first: string, last: string): string {
    const mark = `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase();
    return mark || 'A';
}

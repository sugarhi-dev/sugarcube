import {
    AppstoreOutlined,
    BellOutlined,
    BookOutlined,
    CalendarOutlined,
    CloseOutlined,
    HomeOutlined,
    LogoutOutlined,
    PlusOutlined,
    QuestionCircleOutlined,
    SearchOutlined,
    SettingOutlined,
    UserOutlined,
    VerifiedOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import { App as AntdApp, Input } from 'antd';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { createWorkProfile, getProfilePhotoUrl } from '../api/me.ts';
import { beginSignOut } from '../auth/oidc.ts';
import { calendarPath } from '../pages/calendar/paths.ts';
import { profilePath } from '../pages/profile/ProfilePage.tsx';
import { onSettingsPath, settingsSectionPath } from '../pages/settings/paths.ts';
import { useAppDispatch, useAppSelector, useSession } from '../store/hooks.ts';
import { profileLoaded } from '../store/profileSlice.ts';
import { sessionCleared } from '../store/sessionSlice.ts';

type AccountItem = {
    key: string;
    label: string;
    icon: ReactNode;
    tone?: 'create' | 'danger';
};

const menuSections: Array<{ label: string; items: AccountItem[] }> = [
    {
        label: 'Menu',
        items: [
            { key: 'dashboard', label: 'Profile', icon: <HomeOutlined /> },
            { key: 'projects', label: 'Projects', icon: <VideoCameraOutlined /> },
            { key: 'short-list', label: 'Short List', icon: <BookOutlined /> },
            { key: 'calendar', label: 'Calendar', icon: <CalendarOutlined /> },
            { key: 'new-profile', label: 'New Profile', icon: <PlusOutlined />, tone: 'create' },
        ],
    },
    {
        label: 'Crew',
        items: [
            { key: 'crew-profiles', label: 'My Crew Profiles', icon: <UserOutlined /> },
            { key: 'media', label: 'Media & Reels', icon: <AppstoreOutlined /> },
            { key: 'verified', label: 'Get Verified', icon: <VerifiedOutlined /> },
        ],
    },
    {
        label: 'Account',
        items: [
            { key: 'settings', label: 'Account Settings', icon: <SettingOutlined /> },
            { key: 'notifications', label: 'Notifications', icon: <BellOutlined /> },
        ],
    },
];

const menuFooter: AccountItem[] = [
    { key: 'help', label: 'Help & Support', icon: <QuestionCircleOutlined /> },
    { key: 'sign-out', label: 'Log out', icon: <LogoutOutlined />, tone: 'danger' },
];

export function Frame({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const creatingProfile = useRef(false);
    const { message } = AntdApp.useApp();
    const accountRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const accessToken = session?.accessToken ?? null;
    const photoId = user?.photo ?? null;

    useEffect(() => {
        if (!accessToken || !photoId) {
            setPhotoUrl(null);
            return;
        }

        let active = true;
        setPhotoUrl(null);
        void getProfilePhotoUrl(accessToken).then((link) => {
            if (active) {
                setPhotoUrl(link.url);
            }
        }).catch(() => {
            if (active) {
                setPhotoUrl(null);
            }
        });

        return () => {
            active = false;
        };
    }, [accessToken, photoId]);

    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        function onPointerDown(event: PointerEvent): void {
            if (!accountRef.current?.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }

        function onKeyDown(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                setMenuOpen(false);
            }
        }

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    function signOut(): void {
        if (!session) {
            return;
        }
        setMenuOpen(false);
        dispatch(sessionCleared());
        beginSignOut(session.idToken);
    }

    function onItem(key: string): void {
        if (key === 'sign-out') {
            signOut();
            return;
        }
        setMenuOpen(false);
        if (key === 'dashboard') {
            navigate(profilePath);
            return;
        }
        if (key === 'calendar') {
            navigate(calendarPath);
            return;
        }
        if (key === 'settings') {
            navigate(settingsSectionPath('personal'));
            return;
        }
        if (key === 'notifications') {
            navigate(settingsSectionPath('notifications'));
            return;
        }
        if (key === 'new-profile') {
            void onNewProfile();
        }
    }

    async function onNewProfile(): Promise<void> {
        if (!session || creatingProfile.current) {
            return;
        }
        if (user?.status !== 'live') {
            message.info('You can add another profile after this one is approved.');
            return;
        }

        creatingProfile.current = true;
        try {
            const updated = await createWorkProfile(session.accessToken);
            dispatch(profileLoaded({ user: updated, forSubject: session.profile.subject }));
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not start a new profile.');
        } finally {
            creatingProfile.current = false;
        }
    }

    const given = user?.first_name || session?.profile.givenName || '';
    const family = user?.last_name || session?.profile.familyName || '';
    const mark = initials(given, family);
    const displayName = [given, family].filter(Boolean).join(' ') || 'Your account';
    const email = user?.email || session?.profile.email || '';
    const onDashboard = location.pathname === '/' || location.pathname === '/profile';
    const onCalendar = location.pathname === calendarPath;
    const onSettings = onSettingsPath(location.pathname);
    const onNotifications = location.pathname === settingsSectionPath('notifications');

    return (
        <div className="app-canvas">
            <div className="app-frame">
                <header className="app-bar">
                    <div className="app-bar-side" aria-hidden="true" />
                    <div className="app-search-wrap">
                        <Input
                            className="app-search"
                            prefix={<SearchOutlined />}
                            placeholder="Search crew, projects, resources..."
                            aria-label="Search crew, projects, resources"
                            allowClear
                        />
                    </div>
                    <div className="app-tools">
                        <div className="app-account" ref={accountRef}>
                            <button
                                type="button"
                                className="app-avatar"
                                aria-label="Account menu"
                                aria-haspopup="dialog"
                                aria-expanded={menuOpen}
                                aria-controls={menuOpen ? menuId : undefined}
                                onClick={() => setMenuOpen((open) => !open)}
                            >
                                {photoUrl ? <img src={photoUrl} alt="" onError={() => setPhotoUrl(null)} /> : mark}
                            </button>
                            {menuOpen ? (
                                <div className="account-menu" id={menuId} role="dialog" aria-label="Account menu">
                                    <div className="account-menu-head">
                                        <span className="account-menu-avatar" aria-hidden="true">
                                            {photoUrl ? <img src={photoUrl} alt="" /> : mark}
                                        </span>
                                        <span className="account-menu-id">
                                            <span className="account-menu-name">{displayName}</span>
                                            {email ? <span className="account-menu-email">{email}</span> : null}
                                        </span>
                                        <button
                                            type="button"
                                            className="account-menu-close"
                                            aria-label="Close account menu"
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            <CloseOutlined />
                                        </button>
                                    </div>
                                    <div className="account-menu-body">
                                        {menuSections.map((section) => (
                                            <section key={section.label} className="account-menu-section" aria-label={section.label}>
                                                <p className="account-menu-label">{section.label}</p>
                                                {section.items.map((item) => (
                                                    <MenuButton
                                                        key={item.key}
                                                        item={item}
                                                        current={
                                                            (item.key === 'dashboard' && onDashboard)
                                                            || (item.key === 'calendar' && onCalendar)
                                                            || (item.key === 'settings' && onSettings && !onNotifications)
                                                            || (item.key === 'notifications' && onNotifications)
                                                        }
                                                        onSelect={onItem}
                                                    />
                                                ))}
                                            </section>
                                        ))}
                                    </div>
                                    <div className="account-menu-foot">
                                        {menuFooter.map((item) => (
                                            <MenuButton key={item.key} item={item} onSelect={onItem} />
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </header>
                <main className="app-frame-main">{children}</main>
            </div>
        </div>
    );
}

function MenuButton({
    item,
    current = false,
    onSelect,
}: {
    item: AccountItem;
    current?: boolean;
    onSelect: (key: string) => void;
}) {
    return (
        <button
            type="button"
            className={itemClass(item, current)}
            aria-current={current ? 'page' : undefined}
            // onClick={() => onSelect(item.key)}
            onClick={
                item.key === 'calendar' || item.key === 'new-profile'
                    ? undefined
                    : () => onSelect(item.key)
            }
        >
            <span className="account-menu-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
        </button>
    );
}

function itemClass(item: AccountItem, current: boolean): string {
    if (current) {
        return 'account-menu-item is-current';
    }
    if (item.tone === 'create') {
        return 'account-menu-item is-create';
    }
    if (item.tone === 'danger') {
        return 'account-menu-item is-danger';
    }
    return 'account-menu-item';
}

function initials(first: string, last: string): string {
    const mark = `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase();
    return mark || '?';
}

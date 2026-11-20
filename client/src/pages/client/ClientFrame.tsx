import {
    BellOutlined,
    BookOutlined,
    CloseOutlined,
    FolderOutlined,
    GlobalOutlined,
    HomeOutlined,
    LogoutOutlined,
    PlusOutlined,
    QuestionCircleOutlined,
    SafetyCertificateOutlined,
    SearchOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { Input, type InputRef } from 'antd';
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getProfilePhotoUrl } from '../../api/me.ts';
import { beginSignOut } from '../../auth/oidc.ts';
import logoWordmark from '../../landing/assets/logo-wordmark.svg';
import { useAppDispatch, useAppSelector, useSession } from '../../store/hooks.ts';
import { sessionCleared } from '../../store/sessionSlice.ts';
import { clientHomePath, clientSettingsSectionPath, onClientSettingsPath } from './paths.ts';

const SearchFocusContext = createContext<() => void>(() => {});

export function useClientSearch(): () => void {
    return useContext(SearchFocusContext);
}

type MenuItem = {
    key: string;
    label: string;
    icon: ReactNode;
    badge?: string;
    meta?: string;
};

const menuMain: MenuItem[] = [
    { key: 'home', label: 'Home', icon: <HomeOutlined /> },
    { key: 'projects', label: 'Projects', icon: <FolderOutlined /> },
    { key: 'search', label: 'Search Crew', icon: <SearchOutlined /> },
    { key: 'shortlist', label: 'Shortlist', icon: <BookOutlined /> },
];

const menuAccount: MenuItem[] = [
    { key: 'verified', label: 'Get verified', icon: <SafetyCertificateOutlined /> },
    { key: 'settings', label: 'Account settings', icon: <SettingOutlined /> },
    { key: 'notifications', label: 'Notifications', icon: <BellOutlined />, badge: '3' },
    { key: 'language', label: 'Language & currency', icon: <GlobalOutlined />, meta: 'EN · USD' },
];

const menuFooter: MenuItem[] = [
    { key: 'help', label: 'Help & support', icon: <QuestionCircleOutlined /> },
    { key: 'sign-out', label: 'Log out', icon: <LogoutOutlined /> },
];

export function ClientFrame({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    const searchRef = useRef<InputRef>(null);
    const accountRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const [menuOpen, setMenuOpen] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
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

    function focusSearch(): void {
        searchRef.current?.focus();
    }

    function onMenu(key: string): void {
        if (key === 'sign-out') {
            signOut();
            return;
        }
        if (key === 'search') {
            setMenuOpen(false);
            focusSearch();
            return;
        }
        setMenuOpen(false);
        if (key === 'home') {
            navigate(clientHomePath);
            return;
        }
        if (key === 'settings') {
            navigate(clientSettingsSectionPath('profile'));
            return;
        }
        if (key === 'notifications') {
            navigate(clientSettingsSectionPath('notifications'));
            return;
        }
        if (key === 'verified') {
            navigate(clientSettingsSectionPath('verification'));
        }
    }

    const given = user?.first_name || session?.profile.givenName || '';
    const family = user?.last_name || session?.profile.familyName || '';
    const email = user?.email || session?.profile.email || '';
    const mark = initials(given, family);
    const displayName = [given, family].filter(Boolean).join(' ') || 'Your account';
    const onHome = location.pathname === clientHomePath;
    const onNotifications = location.pathname === clientSettingsSectionPath('notifications');
    const onVerification = location.pathname === clientSettingsSectionPath('verification');
    const onSettings = onClientSettingsPath(location.pathname) && !onNotifications && !onVerification;

    return (
        <SearchFocusContext.Provider value={focusSearch}>
            <div className="app-canvas client-home">
                <div className="app-frame">
                    <header className="app-bar">
                        <div className="app-bar-side">
                            <img className="client-logo" src={logoWordmark} alt="Sugarcube" width={147} height={26} />
                        </div>
                        <div className="app-search-wrap">
                            <Input
                                ref={searchRef}
                                className="app-search"
                                prefix={<SearchOutlined />}
                                placeholder="Search crew, projects, resources..."
                                aria-label="Search crew, projects, resources"
                                allowClear
                            />
                        </div>
                        <div className="app-tools">
                            <button
                                type="button"
                                className="app-icon-btn"
                                aria-label="Notifications"
                                onClick={() => navigate(clientSettingsSectionPath('notifications'))}
                            >
                                <BellOutlined />
                            </button>
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
                                    <div className="client-menu" id={menuId} role="dialog" aria-label="Account menu">
                                        <div className="client-menu-head">
                                            <span className="client-menu-avatar" aria-hidden="true">
                                                {photoUrl ? <img src={photoUrl} alt="" /> : mark}
                                            </span>
                                            <span className="client-menu-id">
                                                <span className="client-menu-name">{displayName}</span>
                                                {email ? <span className="client-menu-email">{email}</span> : null}
                                            </span>
                                            <button
                                                type="button"
                                                className="client-menu-close"
                                                aria-label="Close account menu"
                                                onClick={() => setMenuOpen(false)}
                                            >
                                                <CloseOutlined />
                                            </button>
                                        </div>
                                        <button type="button" className="client-menu-start" onClick={() => setMenuOpen(false)}>
                                            <PlusOutlined /> Start a new project
                                        </button>
                                        <div className="client-menu-list">
                                            {menuMain.map((item) => (
                                                <MenuButton key={item.key} item={item} current={item.key === 'home' && onHome} onSelect={onMenu} />
                                            ))}
                                        </div>
                                        <div className="client-menu-list client-menu-split">
                                            {menuAccount.map((item) => (
                                                <MenuButton
                                                    key={item.key}
                                                    item={item}
                                                    current={
                                                        (item.key === 'settings' && onSettings)
                                                        || (item.key === 'notifications' && onNotifications)
                                                        || (item.key === 'verified' && onVerification)
                                                    }
                                                    onSelect={onMenu}
                                                />
                                            ))}
                                        </div>
                                        <div className="client-menu-foot">
                                            {menuFooter.map((item) => (
                                                <MenuButton key={item.key} item={item} onSelect={onMenu} />
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
        </SearchFocusContext.Provider>
    );
}

function MenuButton({
    item,
    current = false,
    onSelect,
}: {
    item: MenuItem;
    current?: boolean;
    onSelect: (key: string) => void;
}) {
    return (
        <button
            type="button"
            className={current ? 'client-menu-item is-current' : 'client-menu-item'}
            aria-current={current ? 'page' : undefined}
            onClick={() => onSelect(item.key)}
        >
            <span className="client-menu-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge ? <span className="client-menu-badge">{item.badge}</span> : null}
            {item.meta ? <span className="client-menu-meta">{item.meta}</span> : null}
        </button>
    );
}

function initials(first: string, last: string): string {
    const mark = `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase();
    return mark || '?';
}

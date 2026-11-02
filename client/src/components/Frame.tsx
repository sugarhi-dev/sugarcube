import { BellOutlined, MenuOutlined, SearchOutlined } from '@ant-design/icons';
import { Dropdown, Input, Popover } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { getProfilePhotoUrl } from '../api/me.ts';
import { useAppDispatch, useAppSelector, useSession } from '../store/hooks.ts';
import { sessionCleared } from '../store/sessionSlice.ts';
import { copyThat } from '../theme.ts';

const accountMenu: MenuProps['items'] = [
    { key: 'profile', label: 'Your profile' },
    { type: 'divider' },
    { key: 'sign-out', label: 'Sign out' },
];

export function Frame({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
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

    function onAccount({ key }: { key: string }): void {
        if (key === 'profile') {
            navigate('/profile');
            return;
        }
        if (key === 'sign-out') {
            dispatch(sessionCleared());
            navigate('/sign-in', { replace: true });
        }
    }

    const given = user?.first_name || session?.profile.givenName || '';
    const family = user?.last_name || session?.profile.familyName || '';
    const mark = initials(given, family);

    return (
        <div className="app-canvas">
            <div className="app-frame">
                <header className="app-bar">
                    <div className="app-brand">
                        <Dropdown menu={{ items: accountMenu, onClick: onAccount }} trigger={['click']} placement="bottomLeft">
                            <button type="button" className="app-icon-btn" aria-label="Menu">
                                <MenuOutlined />
                            </button>
                        </Dropdown>
                        <Link to="/" className="app-logo">
                            COPY
                            <span style={{ color: copyThat.accent }}>THAT</span>
                        </Link>
                    </div>
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
                        <Popover content="No notifications yet." trigger="click" placement="bottomRight">
                            <button type="button" className="app-icon-btn" aria-label="Notifications">
                                <BellOutlined />
                            </button>
                        </Popover>
                        <Dropdown menu={{ items: accountMenu, onClick: onAccount }} trigger={['click']} placement="bottomRight">
                            <button type="button" className="app-avatar" aria-label="Account menu">
                                {photoUrl ? <img src={photoUrl} alt="" onError={() => setPhotoUrl(null)} /> : mark}
                            </button>
                        </Dropdown>
                    </div>
                </header>
                <main className="app-frame-main">{children}</main>
            </div>
        </div>
    );
}

function initials(first: string, last: string): string {
    const mark = `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase();
    return mark || '?';
}

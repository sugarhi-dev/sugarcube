import {
    BellOutlined,
    CreditCardOutlined,
    SafetyOutlined,
    StarOutlined,
    UnorderedListOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { AccountType } from '../../api/me.ts';
import {
    settingsSectionPath,
    settingsSectionTitle,
    type SettingsSection,
} from './paths.ts';

const navItems: Array<{ key: SettingsSection; icon: ReactNode; badge?: string }> = [
    { key: 'personal', icon: <UserOutlined /> },
    { key: 'additional', icon: <UnorderedListOutlined /> },
    { key: 'payments', icon: <CreditCardOutlined /> },
    { key: 'notifications', icon: <BellOutlined /> },
    { key: 'security', icon: <SafetyOutlined /> },
    { key: 'subscription', icon: <StarOutlined />, badge: 'PRO' },
];

export function SettingsFrame({
    section,
    accountType,
}: {
    section: SettingsSection;
    accountType: AccountType | null;
}) {
    return (
        <aside className="settings-nav">
            <h1>Settings</h1>
            <p className="settings-account">
                <span>{accountLine(accountType)}</span>
                <span aria-hidden="true"> · </span>
                <Link className="settings-upgrade-link" to={settingsSectionPath('subscription')}>Upgrade</Link>
            </p>
            <nav aria-label="Settings">
                {navItems.map((item) => {
                    const current = item.key === section;
                    return (
                        <Link
                            key={item.key}
                            to={settingsSectionPath(item.key)}
                            className={current ? 'settings-nav-item is-current' : 'settings-nav-item'}
                            aria-current={current ? 'page' : undefined}
                        >
                            <span className="settings-nav-icon" aria-hidden="true">{item.icon}</span>
                            <span>{settingsSectionTitle(item.key)}</span>
                            {item.badge ? <span className="settings-pro">{item.badge}</span> : null}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

export function SettingsHeading({ title, lede }: { title: string; lede: string }) {
    return (
        <>
            <h2>{title}</h2>
            <p className="settings-lede">{lede}</p>
        </>
    );
}

export function SettingsFooter({
    savedAt,
    saving,
    onCancel,
}: {
    savedAt: Date | null;
    saving: boolean;
    onCancel: () => void;
}) {
    return (
        <div className="settings-footer">
            {savedAt ? <span className="settings-saved">{savedLabel(savedAt)}</span> : <span />}
            <Button htmlType="button" disabled={saving} onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>Save changes</Button>
        </div>
    );
}

function accountLine(accountType: AccountType | null): string {
    if (accountType === 'client') {
        return 'Basic client account';
    }
    if (accountType === 'crew') {
        return 'Basic crew account';
    }
    return 'Basic account';
}

function savedLabel(savedAt: Date): string {
    const minutes = Math.floor((Date.now() - savedAt.getTime()) / 60000);
    if (minutes < 1) {
        return 'Last saved just now';
    }
    if (minutes === 1) {
        return 'Last saved 1 min ago';
    }
    if (minutes < 60) {
        return `Last saved ${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours === 1) {
        return 'Last saved 1 hour ago';
    }
    return `Last saved ${hours} hours ago`;
}

export function useSavedClock(savedAt: Date | null): void {
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!savedAt) {
            return;
        }
        const id = window.setInterval(() => setTick((value) => value + 1), 30000);
        return () => window.clearInterval(id);
    }, [savedAt]);
}

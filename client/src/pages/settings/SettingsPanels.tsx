import {
    CalendarOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    FundOutlined,
    IdcardOutlined,
    MailOutlined,
    PlusOutlined,
    SafetyCertificateOutlined,
    StarFilled,
    StarOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { App as AntdApp, Button, Input, Switch } from 'antd';
import { useState, type ReactNode } from 'react';
import type { CurrentUser } from '../../api/me.ts';
import { SettingsFooter, SettingsHeading } from './SettingsFrame.tsx';

type Channel = {
    key: string;
    title: string;
    detail: string;
    email: boolean;
    push: boolean;
};

const defaultChannels: Channel[] = [
    {
        key: 'booking',
        title: 'Booking & project updates',
        detail: 'Requests, confirmations, call sheets and schedule changes.',
        email: true,
        push: true,
    },
    {
        key: 'messages',
        title: 'Messages',
        detail: 'New messages from clients and collaborators.',
        email: true,
        push: true,
    },
    {
        key: 'receipts',
        title: 'Payment receipts & invoices',
        detail: 'Deposits, releases and monthly statements.',
        email: true,
        push: false,
    },
    {
        key: 'reminders',
        title: 'Reminders & call times',
        detail: 'Day-before reminders for booked days.',
        email: true,
        push: true,
    },
    {
        key: 'tips',
        title: 'Tips & marketing',
        detail: 'Product news and featured crew round-ups.',
        email: false,
        push: false,
    },
];

const clientFeatures = [
    {
        icon: <TeamOutlined />,
        title: 'Multiple users',
        detail: 'Invite your team — producers, accountants, agency.',
    },
    {
        icon: <FundOutlined />,
        title: 'Full budgeting tool',
        detail: 'AICP budgets, top sheets and live actuals.',
    },
    {
        icon: <CalendarOutlined />,
        title: 'Production tools',
        detail: 'Call sheet maker, PO maker and resources.',
    },
];

const crewFeatures = [
    {
        icon: <IdcardOutlined />,
        title: 'Multiple crew profiles',
        detail: 'Different positions and cities under one account.',
    },
    {
        icon: <SafetyCertificateOutlined />,
        title: 'Verified badge',
        detail: 'ID + reference checks, shown on your profile.',
    },
    {
        icon: <StarOutlined />,
        title: 'Featured account',
        detail: 'Priority placement in search and round-ups.',
    },
];

export function PaymentsBilling() {
    const { message } = AntdApp.useApp();
    const [billingEmail, setBillingEmail] = useState('');
    const [billingAddress, setBillingAddress] = useState('');

    return (
        <>
            <SettingsHeading
                title="Payments & Billing"
                lede="Add a payment method now or at your first booking. Deposits are held in escrow and released on your approval."
            />
            <p className="settings-kicker">Payment methods</p>
            <button
                type="button"
                className="settings-add"
                onClick={() => message.info("Payment methods aren't available yet.")}
            >
                <PlusOutlined />
                Add payment method
            </button>
            <p className="settings-kicker">Billing details</p>
            <label className="settings-field">
                <span>Billing email</span>
                <Input
                    prefix={<MailOutlined />}
                    placeholder="Billing email"
                    autoComplete="email"
                    value={billingEmail}
                    onChange={(event) => setBillingEmail(event.target.value)}
                />
            </label>
            <label className="settings-field">
                <span>Billing address</span>
                <Input
                    prefix={<EnvironmentOutlined />}
                    placeholder="Street, city"
                    autoComplete="street-address"
                    value={billingAddress}
                    onChange={(event) => setBillingAddress(event.target.value)}
                />
            </label>
            <div className="settings-row">
                <div className="settings-row-lead">
                    <span className="settings-row-icon" aria-hidden="true"><ClockCircleOutlined /></span>
                    <span className="settings-row-copy">
                        <span className="settings-row-title">Request net-30 terms</span>
                        <span className="settings-row-detail">Available for CopyThat Verified producers.</span>
                    </span>
                </div>
                <Switch
                    checked={false}
                    aria-label="Request net-30 terms"
                    onChange={() => message.info("Net-30 terms aren't available yet.")}
                />
            </div>
            <p className="settings-kicker">Invoices & receipts</p>
            <div className="settings-row">
                <span className="settings-row-title">No invoices yet</span>
            </div>
        </>
    );
}

export function NotificationSettings() {
    const { message } = AntdApp.useApp();
    const [saved, setSaved] = useState(defaultChannels);
    const [draft, setDraft] = useState(defaultChannels);

    function setChannel(key: string, field: 'email' | 'push', checked: boolean): void {
        setDraft((current) => current.map((row) => row.key === key ? { ...row, [field]: checked } : row));
    }

    return (
        <>
            <SettingsHeading
                title="Notifications"
                lede="Choose what reaches you, and where. Critical booking alerts are always sent."
            />
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    setSaved(draft.map((row) => ({ ...row })));
                    message.info("Notification preferences aren't stored on your account.");
                }}
            >
                <div className="settings-notes">
                    <div className="settings-notes-head">
                        <span />
                        <span>Email</span>
                        <span>Push</span>
                    </div>
                    {draft.map((row) => (
                        <div key={row.key} className="settings-note">
                            <div>
                                <span className="settings-row-title">{row.title}</span>
                                <p>{row.detail}</p>
                            </div>
                            <span className="settings-note-switch">
                                <Switch
                                    checked={row.email}
                                    aria-label={`${row.title} email`}
                                    onChange={(checked) => setChannel(row.key, 'email', checked)}
                                />
                            </span>
                            <span className="settings-note-switch">
                                <Switch
                                    checked={row.push}
                                    aria-label={`${row.title} push`}
                                    onChange={(checked) => setChannel(row.key, 'push', checked)}
                                />
                            </span>
                        </div>
                    ))}
                </div>
                <SettingsFooter
                    savedAt={null}
                    saving={false}
                    onCancel={() => setDraft(saved)}
                />
            </form>
        </>
    );
}

export function AccountSecurity({ user }: { user: CurrentUser }) {
    const { message } = AntdApp.useApp();
    const phoneDetail = user.phone
        ? `Code by SMS to ${maskPhone(user.phone)} on every new device.`
        : 'Code by SMS on every new device.';

    return (
        <>
            <SettingsHeading
                title="Account & Security"
                lede="Login, two-factor authentication and connected accounts."
            />
            <p className="settings-kicker">Login</p>
            <SecurityRow
                title={`Email — ${user.email}`}
                detail="Used for login and receipts."
                action={(
                    <Button htmlType="button" onClick={() => message.info("Your sign-in email can't be changed here.")}>
                        Change
                    </Button>
                )}
            />
            <SecurityRow
                title="Password"
                detail="Used to sign in."
                action={(
                    <Button htmlType="button" onClick={() => message.info("Password changes aren't available yet.")}>
                        Change password
                    </Button>
                )}
            />
            <SecurityRow
                title="Two-factor authentication"
                detail={phoneDetail}
                action={(
                    <Switch
                        checked={false}
                        aria-label="Two-factor authentication"
                        onChange={() => message.info("Two-factor authentication isn't available yet.")}
                    />
                )}
            />
            <p className="settings-kicker">Connected accounts</p>
            <SecurityRow
                title="Google"
                detail="Not connected."
                action={(
                    <Button htmlType="button" onClick={() => message.info("Connected accounts aren't available yet.")}>
                        Connect
                    </Button>
                )}
            />
            <SecurityRow
                title="Facebook"
                detail="Not connected."
                action={(
                    <Button htmlType="button" onClick={() => message.info("Connected accounts aren't available yet.")}>
                        Connect
                    </Button>
                )}
            />
            <p className="settings-kicker is-danger">Danger zone</p>
            <SecurityRow
                title="Deactivate account"
                detail="Hide your account and profiles. You can come back anytime."
                action={(
                    <Button htmlType="button" onClick={() => message.info("Account deactivation isn't available.")}>
                        Deactivate
                    </Button>
                )}
            />
            <SecurityRow
                danger
                title="Delete account"
                detail="Permanently delete your account, profiles and history. This cannot be undone."
                action={(
                    <Button
                        danger
                        type="primary"
                        className="settings-delete"
                        htmlType="button"
                        onClick={() => message.warning("Account deletion isn't available.")}
                    >
                        Delete…
                    </Button>
                )}
            />
        </>
    );
}

export function SubscriptionSettings() {
    const { message } = AntdApp.useApp();
    return (
        <>
            <SettingsHeading
                title="Subscription"
                lede="One subscription — every Pro feature, for both sides of your account."
            />
            <div className="settings-free">
                <div>
                    <div className="settings-row-title">You're on the Free plan</div>
                    <div className="settings-row-detail">Booking, one crew profile and the dashboard are always free.</div>
                </div>
                <span className="settings-free-pill">FREE</span>
            </div>
            <section className="settings-pro-card" aria-label="CopyThat Pro">
                <div className="settings-pro-head">
                    <div>
                        <div className="settings-pro-name">
                            CopyThat Pro
                            <span className="settings-pro">PRO</span>
                        </div>
                        <p>One plan covers everything below — whether you book crew, get booked, or both.</p>
                    </div>
                    <p className="settings-pro-price">$12<span> / month</span></p>
                </div>
                <div className="settings-pro-grid">
                    <FeatureColumn label="For clients" features={clientFeatures} />
                    <FeatureColumn label="For crew" features={crewFeatures} />
                </div>
                <Button
                    type="primary"
                    block
                    icon={<StarFilled />}
                    onClick={() => message.info("Upgrades aren't available yet.")}
                >
                    Upgrade to Pro — $12/month
                </Button>
                <p className="settings-pro-note">Cancel anytime · billed monthly · applies to your whole account.</p>
            </section>
        </>
    );
}

function FeatureColumn({
    label,
    features,
}: {
    label: string;
    features: Array<{ icon: ReactNode; title: string; detail: string }>;
}) {
    return (
        <div>
            <p className="settings-pro-label">{label}</p>
            {features.map((feature) => (
                <div key={feature.title} className="settings-feature">
                    <span className="settings-feature-icon" aria-hidden="true">{feature.icon}</span>
                    <span>
                        <strong>{feature.title}</strong>
                        <span>{feature.detail}</span>
                    </span>
                </div>
            ))}
        </div>
    );
}

function SecurityRow({
    title,
    detail,
    action,
    danger = false,
}: {
    title: string;
    detail: string;
    action: ReactNode;
    danger?: boolean;
}) {
    return (
        <div className={danger ? 'settings-row is-danger' : 'settings-row'}>
            <div className="settings-row-copy">
                <div className="settings-row-title">{title}</div>
                <div className="settings-row-detail">{detail}</div>
            </div>
            {action}
        </div>
    );
}

function maskPhone(phone: string): string {
    const trimmed = phone.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3) {
        return `${parts.slice(0, 2).join(' ')} **** ${parts[parts.length - 1]}`;
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 7) {
        return trimmed;
    }
    const prefixLength = Math.min(4, digits.length - 4);
    const plus = trimmed.startsWith('+') ? '+' : '';
    return `${plus}${digits.slice(0, prefixLength)} **** ${digits.slice(-4)}`;
}

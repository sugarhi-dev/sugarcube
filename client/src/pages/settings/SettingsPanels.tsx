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
import { App as AntdApp, Button, Input, Modal, Switch } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { deactivateAccount, deleteAccount } from '../../api/me.ts';
import { beginSignOut } from '../../auth/oidc.ts';
import { useAppDispatch, useSession } from '../../store/hooks.ts';
import { profileLoaded } from '../../store/profileSlice.ts';
import { sessionCleared } from '../../store/sessionSlice.ts';
import { SettingsFooter, SettingsHeading, useSavedClock } from './SettingsFrame.tsx';

export type NotificationChoices = {
    booking: { email: boolean; push: boolean };
    messages: { email: boolean; push: boolean };
    receipts: { email: boolean; push: boolean };
    reminders: { email: boolean; push: boolean };
    tips: { email: boolean; push: boolean };
};

const notificationCopy: Record<keyof NotificationChoices, { title: string; detail: string }> = {
    booking: {
        title: 'Booking & project updates',
        detail: 'Requests, confirmations, call sheets and schedule changes.',
    },
    messages: {
        title: 'Messages',
        detail: 'New messages from clients and collaborators.',
    },
    receipts: {
        title: 'Payment receipts & invoices',
        detail: 'Deposits, releases and monthly statements.',
    },
    reminders: {
        title: 'Reminders & call times',
        detail: 'Day-before reminders for booked days.',
    },
    tips: {
        title: 'Tips & marketing',
        detail: 'Product news and featured crew round-ups.',
    },
};

const notificationOrder = Object.keys(notificationCopy) as Array<keyof NotificationChoices>;

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

export function NotificationSettings({
    choices,
    saving,
    savedAt,
    onSave,
}: {
    choices: NotificationChoices;
    saving: boolean;
    savedAt: Date | null;
    onSave: (choices: NotificationChoices) => Promise<boolean>;
}) {
    const [draft, setDraft] = useState(choices);
    useSavedClock(savedAt);

    useEffect(() => {
        setDraft(choices);
    }, [choices]);

    function setChannel(key: keyof NotificationChoices, field: 'email' | 'push', checked: boolean): void {
        setDraft((current) => ({
            ...current,
            [key]: { ...current[key], [field]: checked },
        }));
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
                    void onSave(draft);
                }}
            >
                <div className="settings-notes">
                    <div className="settings-notes-head">
                        <span />
                        <span>Email</span>
                        <span>Push</span>
                    </div>
                    {notificationOrder.map((key) => {
                        const copy = notificationCopy[key];
                        const row = draft[key];
                        return (
                            <div key={key} className="settings-note">
                                <div>
                                    <span className="settings-row-title">{copy.title}</span>
                                    <p>{copy.detail}</p>
                                </div>
                                <span className="settings-note-switch">
                                    <Switch
                                        checked={row.email}
                                        aria-label={`${copy.title} email`}
                                        onChange={(checked) => setChannel(key, 'email', checked)}
                                    />
                                </span>
                                <span className="settings-note-switch">
                                    <Switch
                                        checked={row.push}
                                        aria-label={`${copy.title} push`}
                                        onChange={(checked) => setChannel(key, 'push', checked)}
                                    />
                                </span>
                            </div>
                        );
                    })}
                </div>
                <SettingsFooter
                    savedAt={savedAt}
                    saving={saving}
                    onCancel={() => setDraft(choices)}
                />
            </form>
        </>
    );
}

export function AccountSecurity() {
    const { message, modal } = AntdApp.useApp();
    const session = useSession();
    const dispatch = useAppDispatch();
    const [deactivating, setDeactivating] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteText, setDeleteText] = useState('');
    const [deleting, setDeleting] = useState(false);

    function confirmDeactivate(): void {
        if (deactivating) {
            return;
        }
        modal.confirm({
            title: 'Deactivate your account?',
            content: 'Your account and profiles will be hidden. Signing in again turns the account back on and opens your profile.',
            okText: 'Deactivate',
            cancelText: 'Cancel',
            okButtonProps: { danger: true },
            onOk: () => deactivate(),
        });
    }

    async function deactivate(): Promise<void> {
        const token = session?.accessToken;
        const subject = session?.profile.subject;
        if (!token || !subject) {
            return;
        }

        setDeactivating(true);
        try {
            const user = await deactivateAccount(token);
            dispatch(profileLoaded({ user, forSubject: subject }));
        } catch (error) {
            message.error(error instanceof Error && error.message ? error.message : 'Could not deactivate your account.');
            throw error;
        } finally {
            setDeactivating(false);
        }
    }

    function openDelete(): void {
        if (deleting) {
            return;
        }
        setDeleteText('');
        setDeleteOpen(true);
    }

    async function confirmDelete(): Promise<void> {
        const token = session?.accessToken;
        const idToken = session?.idToken;
        if (!token || !idToken || deleteText !== 'delete' || deleting) {
            return;
        }

        setDeleting(true);
        try {
            await deleteAccount(token);
            dispatch(sessionCleared());
            beginSignOut(idToken);
        } catch (error) {
            message.error(error instanceof Error && error.message ? error.message : 'Could not delete your account.');
            setDeleting(false);
        }
    }

    return (
        <>
            <SettingsHeading
                title="Account & Security"
                lede="Deactivate or permanently delete your account."
            />
            <p className="settings-kicker is-danger">Danger zone</p>
            <SecurityRow
                title="Deactivate account"
                detail="Hide your account and profiles. Sign in again to turn it back on."
                action={(
                    <Button htmlType="button" loading={deactivating} onClick={confirmDeactivate}>
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
                        onClick={openDelete}
                    >
                        Delete
                    </Button>
                )}
            />
            <Modal
                title="Delete your account?"
                open={deleteOpen}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true, disabled: deleteText !== 'delete' }}
                confirmLoading={deleting}
                destroyOnHidden
                onOk={() => void confirmDelete()}
                onCancel={() => {
                    if (!deleting) {
                        setDeleteOpen(false);
                    }
                }}
            >
                <p>This permanently deletes your account, profiles, and history. Type delete to confirm.</p>
                <Input
                    autoFocus
                    value={deleteText}
                    placeholder="delete"
                    aria-label="Type delete to confirm"
                    onChange={(event) => setDeleteText(event.target.value)}
                    onPressEnter={() => void confirmDelete()}
                />
            </Modal>
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


import {
    BankOutlined,
    BellOutlined,
    CheckCircleOutlined,
    CheckOutlined,
    CreditCardOutlined,
    EnvironmentOutlined,
    GlobalOutlined,
    LaptopOutlined,
    LockOutlined,
    MailOutlined,
    MobileOutlined,
    PhoneOutlined,
    PlusOutlined,
    UploadOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { App as AntdApp, Button, ConfigProvider, Input, Select, Switch } from 'antd';
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { getProfilePhotoUrl } from '../../api/me.ts';
import { useAppSelector, useSession } from '../../store/hooks.ts';
import { onboardingTheme } from '../../theme.ts';
import { SettingsFooter, useSavedClock } from '../settings/SettingsFrame.tsx';
import { ClientFrame } from './ClientFrame.tsx';
import {
    clientSettingsSectionPath,
    clientSettingsSectionTitle,
    isClientSettingsSection,
    type ClientSettingsSection,
} from './paths.ts';
import './client.css';

const cities = ['Mexico City, MX', 'Los Angeles, US', 'New York, US', 'London, GB'];
const roles = ['Owner / Executive Producer', 'Producer', 'Director', 'Production manager', 'Agency'];
const companyTypes = ['Production company', 'Agency', 'Brand', 'Studio'];
const languages = ['English (US)', 'English (UK)', 'Spanish'];
const currencies = ['USD — $', 'MXN — $', 'EUR — €', 'GBP — £'];
const timeZones = [
    'Central Time — Mexico City (GMT-6)',
    'Pacific Time — Los Angeles (GMT-7)',
    'Eastern Time — New York (GMT-4)',
    'Greenwich Mean Time (GMT)',
];
const accessLevels = ['Full access', 'View only', 'Budget access'] as const;

type AccessLevel = typeof accessLevels[number];

type ProfileDraft = {
    firstName: string;
    lastName: string;
    phone: string;
    phoneVerified: boolean;
    city: string | undefined;
};

type Teammate = {
    id: string;
    initials: string;
    name: string;
    email: string;
    access: AccessLevel;
};

type CompanyDraft = {
    name: string;
    role: string | undefined;
    companyType: string | undefined;
    website: string;
    teammates: Teammate[];
};

type PaymentsDraft = {
    billingEmail: string;
    billingAddress: string;
    net30: boolean;
};

type NoticeChannel = {
    email: boolean;
    sms: boolean;
    push: boolean;
};

type NoticesDraft = {
    language: string;
    currency: string;
    timeZone: string;
    booking: NoticeChannel;
    messages: NoticeChannel;
    projects: NoticeChannel;
    news: NoticeChannel;
};

type Device = {
    id: string;
    title: string;
    detail: string;
    current: boolean;
};

const starterTeam: Teammate[] = [
    { id: 'rick', initials: 'RB', name: 'Rick Brown', email: 'rick@sugarhi.tv', access: 'Full access' },
    { id: 'chelsea', initials: 'CD', name: 'Chelsea Dornan', email: 'chelsea@agency.com', access: 'View only' },
    { id: 'danny', initials: 'DS', name: 'Danny Stevens', email: 'danny@sugarhi.tv', access: 'Budget access' },
];

const invoices = [
    { id: 'nike', title: 'Nike — Up In The Air · deposit', when: 'Aug 24, 2026', amount: '$7,500.00' },
    { id: 'ghira', title: 'Ghirardelli — 2 Day LA · final', when: 'Jun 10, 2026', amount: '$12,400.00' },
    { id: 'frigi', title: 'Frigidaire — DTEM · final', when: 'May 12, 2026', amount: '$9,800.00' },
];

const starterDevices: Device[] = [
    { id: 'mac', title: 'MacBook Pro · Chrome', detail: 'Los Angeles, CA · This device', current: true },
    { id: 'phone', title: 'iPhone · CopyThat app', detail: 'Mexico City, MX · 2 days ago', current: false },
];

const noticeCopy: Record<'booking' | 'messages' | 'projects' | 'news', { title: string; detail: string }> = {
    booking: { title: 'Booking requests & offers', detail: 'Accepts, declines and counter-offers' },
    messages: { title: 'Messages', detail: 'New messages from crew and team' },
    projects: { title: 'Project updates', detail: 'Call sheets, schedule and budget changes' },
    news: { title: 'Product news', detail: 'Occasional updates from CopyThat' },
};

const navItems: Array<{ key: ClientSettingsSection; icon: ReactNode }> = [
    { key: 'profile', icon: <UserOutlined /> },
    { key: 'company', icon: <BankOutlined /> },
    { key: 'payments', icon: <CreditCardOutlined /> },
    { key: 'notifications', icon: <BellOutlined /> },
    { key: 'security', icon: <LockOutlined /> },
    { key: 'verification', icon: <CheckCircleOutlined /> },
];

export function ClientSettings() {
    const params = useParams();
    const sectionParam = params.section ?? '';
    const section = isClientSettingsSection(sectionParam) ? sectionParam : null;
    if (!section) {
        return <Navigate to={clientSettingsSectionPath('profile')} replace />;
    }
    return (
        <ClientFrame>
            <ClientSettingsBody section={section} />
        </ClientFrame>
    );
}

function ClientSettingsBody({ section }: { section: ClientSettingsSection }) {
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    const { message } = AntdApp.useApp();
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoCleared, setPhotoCleared] = useState(false);
    const [photoBase, setPhotoBase] = useState<{ file: File | null; cleared: boolean }>({ file: null, cleared: false });
    const [preview, setPreview] = useState<string | null>(null);
    const [profile, setProfile] = useState<ProfileDraft>(() => profileFromUser(user?.first_name, user?.last_name, user?.phone));
    const [profileBase, setProfileBase] = useState(profile);
    const [company, setCompany] = useState<CompanyDraft>(() => emptyCompany());
    const [companyBase, setCompanyBase] = useState(company);
    const [payments, setPayments] = useState<PaymentsDraft>(() => ({
        billingEmail: user?.email ?? '',
        billingAddress: '',
        net30: false,
    }));
    const [paymentsBase, setPaymentsBase] = useState(payments);
    const [notices, setNotices] = useState<NoticesDraft>(starterNotices);
    const [noticesBase, setNoticesBase] = useState(notices);
    const [devices, setDevices] = useState(starterDevices);
    const [savedAt, setSavedAt] = useState<Partial<Record<ClientSettingsSection, Date>>>({});
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const accessToken = session?.accessToken ?? null;
    const photoId = user?.photo ?? null;
    const email = user?.email || session?.profile.email || '';
    const sectionSavedAt = savedAt[section] ?? null;
    useSavedClock(sectionSavedAt);

    useEffect(() => {
        document.title = `Settings — ${clientSettingsSectionTitle(section)}`;
        window.scrollTo(0, 0);
    }, [section]);

    useEffect(() => {
        if (!accessToken || !photoId) {
            setPhotoUrl(null);
            return;
        }
        let active = true;
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
        if (!photoFile) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(photoFile);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photoFile]);

    function markSaved(): void {
        setSavedAt((current) => ({ ...current, [section]: new Date() }));
        message.success('Saved on this page.');
    }

    function saveSection(event: FormEvent): void {
        event.preventDefault();
        setSaving(true);
        if (section === 'profile') {
            setProfileBase(profile);
            setPhotoBase({ file: photoFile, cleared: photoCleared });
        } else if (section === 'company') {
            setCompanyBase(company);
        } else if (section === 'payments') {
            setPaymentsBase(payments);
        } else if (section === 'notifications') {
            setNoticesBase(notices);
        }
        markSaved();
        setSaving(false);
    }

    function cancelSection(): void {
        if (section === 'profile') {
            setProfile(profileBase);
            setPhotoFile(photoBase.file);
            setPhotoCleared(photoBase.cleared);
        } else if (section === 'company') {
            setCompany(companyBase);
        } else if (section === 'payments') {
            setPayments(paymentsBase);
        } else if (section === 'notifications') {
            setNotices(noticesBase);
        }
    }

    const shownPhoto = preview ?? (photoCleared ? null : photoUrl);
    const mark = initials(profile.firstName, profile.lastName);

    let panel: ReactNode = null;
    if (section === 'profile') {
        panel = (
            <ProfilePanel
                draft={profile}
                email={email}
                photo={shownPhoto}
                mark={mark}
                fileRef={fileRef}
                onChange={setProfile}
                onPick={() => fileRef.current?.click()}
                onFile={(file) => {
                    void choosePhoto(file, message).then((ok) => {
                        if (ok) {
                            setPhotoFile(file);
                            setPhotoCleared(false);
                        }
                    });
                }}
                onRemove={() => {
                    setPhotoFile(null);
                    setPhotoCleared(true);
                }}
            />
        );
    } else if (section === 'company') {
        panel = <CompanyPanel draft={company} onChange={setCompany} />;
    } else if (section === 'payments') {
        panel = <PaymentsPanel draft={payments} onChange={setPayments} />;
    } else if (section === 'notifications') {
        panel = <NoticesPanel draft={notices} onChange={setNotices} />;
    } else if (section === 'security') {
        panel = <SecurityPanel devices={devices} onSignOutDevice={(id) => setDevices((rows) => rows.filter((row) => row.id !== id))} />;
    } else {
        panel = (
            <VerificationPanel
                email={email}
                phone={profile.phoneVerified ? profile.phone : (user?.phone ?? '')}
                name={[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your account'}
                company={company.name}
            />
        );
    }

    const saves = section === 'profile' || section === 'company' || section === 'payments' || section === 'notifications';

    return (
        <ConfigProvider theme={onboardingTheme}>
            <div className="review-sheet settings-sheet">
                <div className="settings-shell client-settings">
                    <aside className="settings-nav">
                        <h1>Settings</h1>
                        <p className="settings-account">Client account</p>
                        <nav aria-label="Settings">
                            {navItems.map((item) => {
                                const current = item.key === section;
                                return (
                                    <Link
                                        key={item.key}
                                        to={clientSettingsSectionPath(item.key)}
                                        className={current ? 'settings-nav-item is-current' : 'settings-nav-item'}
                                        aria-current={current ? 'page' : undefined}
                                    >
                                        <span className="settings-nav-icon" aria-hidden="true">{item.icon}</span>
                                        <span>{clientSettingsSectionTitle(item.key)}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>
                    <div className="settings-main">
                        {saves ? (
                            <form onSubmit={saveSection}>
                                {panel}
                                <SettingsFooter savedAt={sectionSavedAt} saving={saving} onCancel={cancelSection} />
                            </form>
                        ) : panel}
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}

function ProfilePanel({
    draft,
    email,
    photo,
    mark,
    fileRef,
    onChange,
    onPick,
    onFile,
    onRemove,
}: {
    draft: ProfileDraft;
    email: string;
    photo: string | null;
    mark: string;
    fileRef: RefObject<HTMLInputElement | null>;
    onChange: (draft: ProfileDraft) => void;
    onPick: () => void;
    onFile: (file: File) => void;
    onRemove: () => void;
}) {
    const { message } = AntdApp.useApp();
    return (
        <>
            <h2>Profile</h2>
            <p className="settings-lede">How you appear to crew on bookings and messages.</p>
            <Block label="Photo" detail="JPG or PNG, at least 400×400px.">
                <div className="client-settings-photo">
                    <span className="settings-photo-mark" aria-hidden="true">
                        {photo ? <img src={photo} alt="" /> : mark}
                    </span>
                    <Button htmlType="button" icon={<UploadOutlined />} onClick={onPick}>Upload new</Button>
                    {photo ? (
                        <button type="button" className="client-settings-text" onClick={onRemove}>Remove</button>
                    ) : null}
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        hidden
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (file) {
                                onFile(file);
                            }
                        }}
                    />
                </div>
            </Block>
            <Block label="Name">
                <div className="client-settings-pair">
                    <Field label="First name">
                        <Input
                            value={draft.firstName}
                            autoComplete="given-name"
                            onChange={(event) => onChange({ ...draft, firstName: event.target.value })}
                        />
                    </Field>
                    <Field label="Last name">
                        <Input
                            value={draft.lastName}
                            autoComplete="family-name"
                            onChange={(event) => onChange({ ...draft, lastName: event.target.value })}
                        />
                    </Field>
                </div>
            </Block>
            <Block label="Contact" detail="Used for booking confirmations and shoot-day calls.">
                <Field label="Email">
                    <Input
                        className="profile-readonly"
                        readOnly
                        prefix={<MailOutlined />}
                        value={email}
                        suffix={email ? <span className="client-settings-pill"><CheckOutlined /> Verified</span> : undefined}
                    />
                </Field>
                <Field label="Mobile">
                    <div className="client-settings-inline">
                        <Input
                            prefix={<PhoneOutlined />}
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="+52 55 0000 0000"
                            value={draft.phone}
                            onChange={(event) => onChange({ ...draft, phone: event.target.value, phoneVerified: false })}
                        />
                        {draft.phoneVerified ? (
                            <span className="client-settings-pill"><CheckOutlined /> Verified</span>
                        ) : (
                            <button
                                type="button"
                                className="settings-verify"
                                onClick={() => {
                                    if (!draft.phone.trim()) {
                                        message.info('Enter a mobile number to verify.');
                                        return;
                                    }
                                    onChange({ ...draft, phoneVerified: true });
                                }}
                            >
                                Verify
                            </button>
                        )}
                    </div>
                </Field>
            </Block>
            <Block label="Location" detail="Your home city sets default search and local rates.">
                <Field label="City">
                    <Select
                        allowClear
                        placeholder="City"
                        prefix={<EnvironmentOutlined />}
                        value={draft.city}
                        options={cities.map((city) => ({ value: city, label: city }))}
                        onChange={(city) => onChange({ ...draft, city })}
                    />
                </Field>
            </Block>
        </>
    );
}

function CompanyPanel({
    draft,
    onChange,
}: {
    draft: CompanyDraft;
    onChange: (draft: CompanyDraft) => void;
}) {
    const [inviting, setInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteAccess, setInviteAccess] = useState<AccessLevel>('View only');
    const { message } = AntdApp.useApp();

    function addTeammate(): void {
        const email = inviteEmail.trim();
        if (!email.includes('@')) {
            message.info('Enter an email address to invite.');
            return;
        }
        const name = email.split('@')[0] ?? email;
        onChange({
            ...draft,
            teammates: [
                ...draft.teammates,
                { id: `${email}-${draft.teammates.length}`, initials: initials(name, ''), name, email, access: inviteAccess },
            ],
        });
        setInviteEmail('');
        setInviting(false);
    }

    return (
        <>
            <h2>Company & team</h2>
            <p className="settings-lede">Added when you first book. Crew see your company on every request.</p>
            <Block label="Company">
                <Field label="Company name">
                    <Input
                        prefix={<BankOutlined />}
                        placeholder="Sugarhi.tv"
                        value={draft.name}
                        onChange={(event) => onChange({ ...draft, name: event.target.value })}
                    />
                </Field>
                <div className="client-settings-pair">
                    <Field label="Your role">
                        <Select
                            allowClear
                            placeholder="Owner / Executive Producer"
                            value={draft.role}
                            options={roles.map((role) => ({ value: role, label: role }))}
                            onChange={(role) => onChange({ ...draft, role })}
                        />
                    </Field>
                    <Field label="Company type">
                        <Select
                            allowClear
                            placeholder="Production company"
                            value={draft.companyType}
                            options={companyTypes.map((type) => ({ value: type, label: type }))}
                            onChange={(companyType) => onChange({ ...draft, companyType })}
                        />
                    </Field>
                </div>
                <Field label="Website" optional>
                    <Input
                        prefix={<GlobalOutlined />}
                        placeholder="sugarhi.tv"
                        value={draft.website}
                        onChange={(event) => onChange({ ...draft, website: event.target.value })}
                    />
                </Field>
            </Block>
            <Block label="Team" detail="Invite producers, agencies or accounting to your projects.">
                <ul className="client-settings-team">
                    {draft.teammates.map((person) => (
                        <li key={person.id}>
                            <span className="client-settings-avatar" aria-hidden="true">{person.initials}</span>
                            <span>
                                <span className="settings-row-title">{person.name}</span>
                                <span className="settings-row-detail">{person.email}</span>
                            </span>
                            <Select
                                value={person.access}
                                options={accessLevels.map((level) => ({ value: level, label: level }))}
                                onChange={(access) => onChange({
                                    ...draft,
                                    teammates: draft.teammates.map((row) => row.id === person.id ? { ...row, access } : row),
                                })}
                            />
                        </li>
                    ))}
                </ul>
                {inviting ? (
                    <div className="client-settings-invite">
                        <Input
                            type="email"
                            placeholder="name@studio.com"
                            value={inviteEmail}
                            onChange={(event) => setInviteEmail(event.target.value)}
                            onPressEnter={addTeammate}
                        />
                        <Select
                            value={inviteAccess}
                            options={accessLevels.map((level) => ({ value: level, label: level }))}
                            onChange={setInviteAccess}
                        />
                        <Button htmlType="button" type="primary" onClick={addTeammate}>Add</Button>
                    </div>
                ) : (
                    <button type="button" className="settings-add" onClick={() => setInviting(true)}>
                        <PlusOutlined /> Invite teammate
                    </button>
                )}
            </Block>
        </>
    );
}

function PaymentsPanel({
    draft,
    onChange,
}: {
    draft: PaymentsDraft;
    onChange: (draft: PaymentsDraft) => void;
}) {
    const { message } = AntdApp.useApp();
    return (
        <>
            <h2>Payments & billing</h2>
            <p className="settings-lede">You're only charged when crew accept. Deposits are held in escrow.</p>
            <Block label="Payment methods" detail="Card and bank details stay with Stripe.">
                <button
                    type="button"
                    className="client-stripe"
                    onClick={() => message.info("Stripe isn't connected in this build.")}
                >
                    Connect with Stripe
                </button>
            </Block>
            <Block label="Billing details" detail="Shown on invoices and receipts.">
                <Field label="Billing email">
                    <Input
                        prefix={<MailOutlined />}
                        type="email"
                        autoComplete="email"
                        placeholder="billing@sugarhi.tv"
                        value={draft.billingEmail}
                        onChange={(event) => onChange({ ...draft, billingEmail: event.target.value })}
                    />
                </Field>
                <Field label="Billing address">
                    <Input
                        prefix={<EnvironmentOutlined />}
                        placeholder="Av. Álvaro Obregón 185, Roma Norte, CDMX"
                        autoComplete="street-address"
                        value={draft.billingAddress}
                        onChange={(event) => onChange({ ...draft, billingAddress: event.target.value })}
                    />
                </Field>
                <div className="client-settings-switch-row">
                    <span>
                        <span className="settings-row-title">Net-30 terms</span>
                        <span className="settings-row-detail">Available once your company is verified.</span>
                    </span>
                    <Switch
                        checked={draft.net30}
                        aria-label="Net-30 terms"
                        onChange={(net30) => onChange({ ...draft, net30 })}
                    />
                </div>
            </Block>
            <Block label="Invoices">
                <ul className="client-settings-invoices">
                    {invoices.map((invoice) => (
                        <li key={invoice.id}>
                            <span>
                                <span className="settings-row-title">{invoice.title}</span>
                                <span className="settings-row-detail">{invoice.when}</span>
                            </span>
                            <span className="client-settings-amount">{invoice.amount}</span>
                            <button
                                type="button"
                                className="client-settings-pdf"
                                onClick={() => message.info("Invoice files aren't available yet.")}
                            >
                                PDF
                            </button>
                        </li>
                    ))}
                </ul>
            </Block>
        </>
    );
}

function NoticesPanel({
    draft,
    onChange,
}: {
    draft: NoticesDraft;
    onChange: (draft: NoticesDraft) => void;
}) {
    const keys = ['booking', 'messages', 'projects', 'news'] as const;
    return (
        <>
            <h2>Notifications & preferences</h2>
            <p className="settings-lede">Language, currency and how we reach you.</p>
            <Block label="Language & region" detail="Prices and dates across the app use these.">
                <div className="client-settings-pair">
                    <Field label="Language">
                        <Select
                            value={draft.language}
                            options={languages.map((language) => ({ value: language, label: language }))}
                            onChange={(language) => onChange({ ...draft, language })}
                        />
                    </Field>
                    <Field label="Currency">
                        <Select
                            value={draft.currency}
                            options={currencies.map((currency) => ({ value: currency, label: currency }))}
                            onChange={(currency) => onChange({ ...draft, currency })}
                        />
                    </Field>
                </div>
                <Field label="Time zone">
                    <Select
                        value={draft.timeZone}
                        options={timeZones.map((timeZone) => ({ value: timeZone, label: timeZone }))}
                        onChange={(timeZone) => onChange({ ...draft, timeZone })}
                    />
                </Field>
            </Block>
            <Block label="Notifications" detail="Choose where each update reaches you.">
                <div className="client-settings-notes">
                    <div className="client-settings-notes-head">
                        <span />
                        <span>Email</span>
                        <span>SMS</span>
                        <span>Push</span>
                    </div>
                    {keys.map((key) => {
                        const copy = noticeCopy[key];
                        const row = draft[key];
                        return (
                            <div key={key} className="client-settings-note">
                                <span>
                                    <span className="settings-row-title">{copy.title}</span>
                                    <span className="settings-row-detail">{copy.detail}</span>
                                </span>
                                <Switch
                                    checked={row.email}
                                    aria-label={`${copy.title} email`}
                                    onChange={(email) => onChange({ ...draft, [key]: { ...row, email } })}
                                />
                                <Switch
                                    checked={row.sms}
                                    aria-label={`${copy.title} SMS`}
                                    onChange={(sms) => onChange({ ...draft, [key]: { ...row, sms } })}
                                />
                                <Switch
                                    checked={row.push}
                                    aria-label={`${copy.title} push`}
                                    onChange={(push) => onChange({ ...draft, [key]: { ...row, push } })}
                                />
                            </div>
                        );
                    })}
                </div>
            </Block>
        </>
    );
}

function SecurityPanel({
    devices,
    onSignOutDevice,
}: {
    devices: Device[];
    onSignOutDevice: (id: string) => void;
}) {
    const { message, modal } = AntdApp.useApp();
    return (
        <>
            <h2>Security</h2>
            <p className="settings-lede">Keep your account and payments safe.</p>
            <Block label="Password">
                <div className="client-settings-password">
                    <Input.Password value="password" readOnly visibilityToggle={false} />
                    <span className="settings-row-detail">Last changed 3 months ago</span>
                    <Button htmlType="button" onClick={() => message.info("Password changes aren't available yet.")}>
                        Change password
                    </Button>
                </div>
            </Block>
            <Block label="Where you're signed in">
                <ul className="client-settings-devices">
                    {devices.map((device) => (
                        <li key={device.id}>
                            <span className="client-settings-device-icon" aria-hidden="true">
                                {device.current ? <LaptopOutlined /> : <MobileOutlined />}
                            </span>
                            <span>
                                <span className="settings-row-title">{device.title}</span>
                                <span className="settings-row-detail">{device.detail}</span>
                            </span>
                            {device.current ? (
                                <span className="client-settings-pill"><CheckOutlined /> Current</span>
                            ) : (
                                <button type="button" className="client-settings-link" onClick={() => onSignOutDevice(device.id)}>
                                    Sign out
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </Block>
            <Block label="Delete account" detail="Removes your projects, messages and payment methods. Active bookings must be closed first.">
                <Button
                    htmlType="button"
                    className="client-settings-delete"
                    onClick={() => {
                        modal.confirm({
                            title: 'Delete your account?',
                            content: 'This permanently deletes your account, projects, messages and payment methods. Active bookings must be closed first.',
                            okText: 'Delete',
                            cancelText: 'Cancel',
                            okButtonProps: { danger: true },
                            onOk: () => {
                                message.info("Account deletion isn't available yet.");
                            },
                        });
                    }}
                >
                    Delete account
                </Button>
            </Block>
        </>
    );
}

function VerificationPanel({
    email,
    phone,
    name,
    company,
}: {
    email: string;
    phone: string;
    name: string;
    company: string;
}) {
    const { message } = AntdApp.useApp();
    const steps = [
        Boolean(email),
        Boolean(phone.trim()),
        false,
        false,
    ];
    const done = steps.filter(Boolean).length;
    return (
        <>
            <h2>Verification</h2>
            <p className="settings-lede">Verified clients get a badge, rank higher with crew and unlock Net-30 terms.</p>
            <Block label="Your status" detail={`${done} of 4 steps done.`}>
                <div className="client-settings-progress" aria-hidden="true">
                    {steps.map((complete, index) => (
                        <span key={index} className={complete ? 'is-done' : undefined} />
                    ))}
                </div>
                <ul className="client-settings-checks">
                    <li>
                        <MailOutlined />
                        <span>
                            <span className="settings-row-title">Email</span>
                            <span className="settings-row-detail">{email || 'Add an email'}</span>
                        </span>
                        {email ? <span className="client-settings-pill"><CheckOutlined /> Done</span> : null}
                    </li>
                    <li>
                        <PhoneOutlined />
                        <span>
                            <span className="settings-row-title">Mobile</span>
                            <span className="settings-row-detail">{phone || 'Add a mobile number'}</span>
                        </span>
                        {phone.trim() ? <span className="client-settings-pill"><CheckOutlined /> Done</span> : null}
                    </li>
                    <li>
                        <UserOutlined />
                        <span>
                            <span className="settings-row-title">Government ID</span>
                            <span className="settings-row-detail">Passport or driver's license · 2 min</span>
                        </span>
                        <Button type="primary" htmlType="button" onClick={() => message.info("ID checks aren't available yet.")}>
                            Start
                        </Button>
                    </li>
                    <li>
                        <BankOutlined />
                        <span>
                            <span className="settings-row-title">Company</span>
                            <span className="settings-row-detail">Business registration or a website domain match</span>
                        </span>
                        <Button htmlType="button" onClick={() => message.info("Company checks aren't available yet.")}>
                            Add
                        </Button>
                    </li>
                </ul>
            </Block>
            <Block label="Your badge" detail="Shows next to your name on projects and booking requests.">
                <div className="client-settings-badge">
                    <span className="client-settings-avatar" aria-hidden="true">{initials(name, '')}</span>
                    <span>
                        <span className="settings-row-title">
                            {name}
                            <span className="client-settings-verified">Verified</span>
                        </span>
                        <span className="settings-row-detail">{[company || 'Client account', email].filter(Boolean).join(' · ')}</span>
                    </span>
                </div>
            </Block>
        </>
    );
}

function Block({ label, detail, children }: { label: string; detail?: string; children: ReactNode }) {
    return (
        <section className="client-settings-block">
            <div>
                <h3>{label}</h3>
                {detail ? <p>{detail}</p> : null}
            </div>
            <div className="client-settings-fields">{children}</div>
        </section>
    );
}

function Field({ label, optional = false, children }: { label: string; optional?: boolean; children: ReactNode }) {
    return (
        <label className="client-settings-field">
            <span>
                {label}
                {optional ? <span className="settings-optional"> Optional</span> : null}
            </span>
            {children}
        </label>
    );
}

function profileFromUser(first: string | undefined, last: string | undefined, phone: string | null | undefined): ProfileDraft {
    return {
        firstName: first ?? '',
        lastName: last ?? '',
        phone: phone ?? '',
        phoneVerified: Boolean(phone?.trim()),
        city: undefined,
    };
}

function emptyCompany(): CompanyDraft {
    return {
        name: '',
        role: undefined,
        companyType: undefined,
        website: '',
        teammates: starterTeam,
    };
}

const starterNotices: NoticesDraft = {
    language: 'English (US)',
    currency: 'USD — $',
    timeZone: 'Central Time — Mexico City (GMT-6)',
    booking: { email: true, sms: true, push: true },
    messages: { email: true, sms: false, push: true },
    projects: { email: true, sms: false, push: false },
    news: { email: false, sms: false, push: false },
};

async function choosePhoto(file: File, message: ReturnType<typeof AntdApp.useApp>['message']): Promise<boolean> {
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        message.error('Use a JPG or PNG photo.');
        return false;
    }
    if (file.size > 8 * 1024 * 1024) {
        message.error('Use a photo smaller than 8 MB.');
        return false;
    }
    try {
        const bitmap = await createImageBitmap(file);
        const tooSmall = bitmap.width < 400 || bitmap.height < 400;
        bitmap.close();
        if (tooSmall) {
            message.error('Use a photo at least 400×400px.');
            return false;
        }
    } catch {
        message.error('Could not read that photo.');
        return false;
    }
    return true;
}

function initials(first: string, last: string): string {
    const mark = `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase();
    return mark || '?';
}

import {
    additionalSettingNames,
    notificationSettingNames,
    userSettingNames,
    type Currency,
    type UserLocale,
    type UserSetting,
    type UserSettingName,
    type UserWorkProfile,
} from '@sugarcube/schema';
import { App as AntdApp, Button, ConfigProvider, Result, Spin } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { ApiError } from '../../api/http.ts';
import {
    listCurrencies,
    listProductionCities,
    type ProductionCity,
} from '../../api/catalog.ts';
import { listSettings, saveSettings } from '../../api/settings.ts';
import {
    createLocale,
    getProfilePhotoUrl,
    getWorkProfile,
    listLocales,
    saveBasic,
    saveWorkProfile,
    updateLocale,
    uploadProfilePhoto,
    type CurrentUser,
} from '../../api/me.ts';
import { Frame } from '../../components/Frame.tsx';
import { useAppDispatch, useAppSelector, useSession } from '../../store/hooks.ts';
import { profileLoaded } from '../../store/profileSlice.ts';
import { onboardingTheme } from '../../theme.ts';
import { AdditionalInfo, type AdditionalSaveInput, type AdditionalSettings } from './AdditionalInfo.tsx';
import { PersonalInfo, type PersonalSaveInput, type PersonalSaveResult } from './PersonalInfo.tsx';
import {
    isSettingsSection,
    settingsSectionPath,
    settingsSectionTitle,
    type SettingsSection,
} from './paths.ts';
import { SettingsFrame } from './SettingsFrame.tsx';
import {
    AccountSecurity,
    NotificationSettings,
    type NotificationChoices,
    PaymentsBilling,
    SubscriptionSettings,
} from './SettingsPanels.tsx';

type SettingsData = {
    cities: ProductionCity[];
    currencies: Currency[];
    locales: UserLocale[];
    settings: UserSetting[];
    workProfile: UserWorkProfile | null;
};

export function SettingsPage() {
    const params = useParams();
    const sectionParam = params.section ?? '';
    const section = isSettingsSection(sectionParam) ? sectionParam : null;
    const dispatch = useAppDispatch();
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    const { message } = AntdApp.useApp();
    const [data, setData] = useState<SettingsData | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [savedSection, setSavedSection] = useState<SettingsSection | null>(null);
    const lock = useRef(false);
    const token = session?.accessToken ?? null;
    const subject = session?.profile.subject ?? null;
    const photoId = user?.photo ?? null;

    useEffect(() => {
        document.title = section ? `Settings — ${settingsSectionTitle(section)}` : 'Settings';
        window.scrollTo(0, 0);
    }, [section]);

    useEffect(() => {
        if (!token) {
            return;
        }
        const accessToken = token;
        let active = true;
        setData(null);
        setLoadError(null);

        void (async () => {
            try {
                const [locales, cities, currencies, settings, workProfile] = await Promise.all([
                    listLocales(accessToken),
                    listProductionCities(accessToken),
                    listCurrencies(accessToken),
                    listSettings(accessToken),
                    getWorkProfile(accessToken).catch((error: unknown) => {
                        if (error instanceof ApiError && error.status === 404) {
                            return null;
                        }
                        throw error;
                    }),
                ]);
                if (!active) {
                    return;
                }
                setData({
                    cities,
                    currencies,
                    locales,
                    settings,
                    workProfile,
                });
            } catch (error) {
                if (!active) {
                    return;
                }
                setLoadError(error instanceof Error ? error.message : 'Could not load settings.');
            }
        })();

        return () => {
            active = false;
        };
    }, [attempt, token]);

    useEffect(() => {
        if (!token || !photoId) {
            setPhotoUrl(null);
            return;
        }
        const accessToken = token;
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
    }, [photoId, token]);

    const notificationChoices = useMemo(
        () => readNotifications(data?.settings ?? []),
        [data?.settings],
    );

    if (!section) {
        return <Navigate to={settingsSectionPath('personal')} replace />;
    }

    async function savePersonal(input: PersonalSaveInput, photo: File | null): Promise<PersonalSaveResult> {
        if (lock.current || !token || !subject || !user || !data) {
            return { ok: false, photoSaved: false };
        }
        lock.current = true;
        setSaving(true);
        const failures: string[] = [];
        let savedAny = false;
        let photoSaved = false;
        try {
            if (photo) {
                try {
                    const saved = await uploadProfilePhoto(token, photo);
                    dispatch(profileLoaded({ user: saved, forSubject: subject }));
                    photoSaved = true;
                    savedAny = true;
                } catch (error) {
                    failures.push(errorText(error, 'Could not update your profile photo.'));
                }
            }

            const phoneChanged = input.phone !== (user.phone ?? '').trim();
            if (phoneChanged) {
                const title = (data.workProfile?.title ?? '').trim();
                const bio = (data.workProfile?.bio ?? '').trim();
                if (!title || !bio) {
                    failures.push('Add a title and bio on your profile before saving your phone.');
                } else {
                    try {
                        const saved = await saveBasic(token, { phone: input.phone, bio, title });
                        dispatch(profileLoaded({ user: saved, forSubject: subject }));
                        savedAny = true;
                    } catch (error) {
                        failures.push(errorText(error, 'Could not save your profile.'));
                    }
                }
            }

            if (input.cityId && input.cityId !== homeCityId(data.locales)) {
                try {
                    const locales = await saveHomeCity(token, data.locales, input.cityId);
                    setData((current) => current ? { ...current, locales } : current);
                    savedAny = true;
                } catch (error) {
                    failures.push(errorText(error, 'Could not save your city.'));
                }
            }

            reportSave(message, failures, savedAny);
            if (savedAny) {
                setSavedAt(new Date());
                setSavedSection('personal');
            }
            return { ok: failures.length === 0, photoSaved };
        } finally {
            lock.current = false;
            setSaving(false);
        }
    }

    async function saveAdditional(input: AdditionalSaveInput): Promise<boolean> {
        if (lock.current || !token || !data) {
            return false;
        }
        lock.current = true;
        setSaving(true);
        const failures: string[] = [];
        let savedAny = false;
        try {
            if (!sameSettings(data.settings, input.settings)) {
                try {
                    const saved = await saveSettings(token, settingWrites(input.settings, data.settings));
                    setData((current) => current ? { ...current, settings: saved } : current);
                    savedAny = true;
                } catch (error) {
                    failures.push(errorText(error, 'Could not save your additional info.'));
                }
            }

            const currentCurrency = data.workProfile?.currency_id ?? null;
            if (input.currencyId !== currentCurrency) {
                if (!data.workProfile || data.workProfile.day_rate === null) {
                    failures.push('Set a day rate on your profile before choosing a currency.');
                } else if (!input.currencyId) {
                    failures.push('Currency stays with your day rate.');
                } else {
                    try {
                        const saved = await saveWorkProfile(token, {
                            day_rate: data.workProfile.day_rate,
                            currency_id: input.currencyId,
                            union_status: data.workProfile.union_status,
                            flat_fee: data.workProfile.flat_fee,
                        });
                        setData((current) => current ? { ...current, workProfile: saved } : current);
                        savedAny = true;
                    } catch (error) {
                        failures.push(errorText(error, 'Could not save your currency.'));
                    }
                }
            }

            reportSave(message, failures, savedAny);
            if (savedAny) {
                setSavedAt(new Date());
                setSavedSection('additional');
            }
            return failures.length === 0;
        } finally {
            lock.current = false;
            setSaving(false);
        }
    }

    async function saveNotifications(choices: NotificationChoices): Promise<boolean> {
        if (lock.current || !token || !data) {
            return false;
        }
        lock.current = true;
        setSaving(true);
        try {
            const saved = await saveSettings(token, notificationWrites(choices, data.settings));
            setData((current) => current ? { ...current, settings: saved } : current);
            setSavedAt(new Date());
            setSavedSection('notifications');
            message.success('Saved changes.');
            return true;
        } catch (error) {
            message.error(errorText(error, 'Could not save your notifications.'));
            return false;
        } finally {
            lock.current = false;
            setSaving(false);
        }
    }

    const homeId = data ? homeCityId(data.locales) : null;

    let body = <div className="settings-loading"><Spin /></div>;
    if (loadError) {
        body = (
            <Result
                status="error"
                title="Could not load settings"
                subTitle={loadError}
                extra={(
                    <Button type="primary" onClick={() => setAttempt((value) => value + 1)}>
                        Try again
                    </Button>
                )}
            />
        );
    } else if (data && user) {
        body = sectionBody(section, {
            user,
            data,
            photoUrl,
            homeId,
            saving,
            savedAt,
            savedSection,
            onSavePersonal: (input, photo) => savePersonal(input, photo),
            onSaveAdditional: (input) => saveAdditional(input),
            notificationChoices,
            onSaveNotifications: (choices) => saveNotifications(choices),
        });
    }

    return (
        <Frame>
            <ConfigProvider theme={onboardingTheme}>
                <div className="review-sheet settings-sheet">
                    <div className="settings-shell">
                        <SettingsFrame section={section} accountType={user?.account_type ?? null} />
                        <div className="settings-main">{body}</div>
                    </div>
                </div>
            </ConfigProvider>
        </Frame>
    );
}

function sectionBody(
    section: SettingsSection,
    props: {
        user: CurrentUser;
        data: SettingsData;
        photoUrl: string | null;
        homeId: string | null;
        saving: boolean;
        savedAt: Date | null;
        savedSection: SettingsSection | null;
        onSavePersonal: (input: PersonalSaveInput, photo: File | null) => Promise<PersonalSaveResult>;
        onSaveAdditional: (input: AdditionalSaveInput) => Promise<boolean>;
        notificationChoices: NotificationChoices;
        onSaveNotifications: (choices: NotificationChoices) => Promise<boolean>;
    },
) {
    if (section === 'personal') {
        return (
            <PersonalInfo
                user={props.user}
                photoUrl={props.photoUrl}
                cities={props.data.cities}
                cityId={props.homeId}
                saving={props.saving}
                savedAt={props.savedSection === 'personal' ? props.savedAt : null}
                onSave={props.onSavePersonal}
            />
        );
    }
    if (section === 'additional') {
        return (
            <AdditionalInfo
                settings={readSettings(props.data.settings)}
                currencies={props.data.currencies}
                currencyId={props.data.workProfile?.currency_id ?? null}
                currencyLocked={!props.data.workProfile || props.data.workProfile.day_rate === null}
                saving={props.saving}
                savedAt={props.savedSection === 'additional' ? props.savedAt : null}
                onSave={props.onSaveAdditional}
            />
        );
    }
    if (section === 'payments') {
        return <PaymentsBilling />;
    }
    if (section === 'notifications') {
        return (
            <NotificationSettings
                choices={props.notificationChoices}
                saving={props.saving}
                savedAt={props.savedSection === 'notifications' ? props.savedAt : null}
                onSave={props.onSaveNotifications}
            />
        );
    }
    if (section === 'security') {
        return <AccountSecurity />;
    }
    return <SubscriptionSettings />;
}

async function saveHomeCity(token: string, locales: UserLocale[], cityId: string): Promise<UserLocale[]> {
    const home = locales.find((row) => row.home_city) ?? null;
    if (home?.production_city_id === cityId) {
        return locales;
    }
    const existing = locales.find((row) => row.production_city_id === cityId);
    if (existing) {
        await updateLocale(token, existing.id, { home_city: true });
    } else if (home) {
        await updateLocale(token, home.id, { production_city_id: cityId, home_city: true });
    } else {
        await createLocale(token, { production_city_id: cityId, home_city: true });
    }
    return listLocales(token);
}

function homeCityId(locales: UserLocale[]): string | null {
    return locales.find((row) => row.home_city)?.production_city_id ?? null;
}

const settingFields: Record<(typeof additionalSettingNames)[number], keyof AdditionalSettings> = {
    company: 'company',
    role: 'role',
    company_type: 'companyType',
    website: 'website',
    instagram: 'instagram',
    vimeo: 'vimeo',
    language: 'language',
};

const notificationFields: Record<keyof NotificationChoices, { email: UserSettingName; push: UserSettingName }> = {
    booking: { email: 'notify_booking_email', push: 'notify_booking_push' },
    messages: { email: 'notify_messages_email', push: 'notify_messages_push' },
    receipts: { email: 'notify_receipts_email', push: 'notify_receipts_push' },
    reminders: { email: 'notify_reminders_email', push: 'notify_reminders_push' },
    tips: { email: 'notify_tips_email', push: 'notify_tips_push' },
};

const notificationDefaults: NotificationChoices = {
    booking: { email: true, push: true },
    messages: { email: true, push: true },
    receipts: { email: true, push: false },
    reminders: { email: true, push: true },
    tips: { email: false, push: false },
};

function readSettings(rows: UserSetting[]): AdditionalSettings {
    const byName = new Map(rows.map((row) => [row.name, row.value]));
    return {
        company: byName.get('company') ?? '',
        role: byName.get('role') ?? '',
        companyType: byName.get('company_type') ?? '',
        website: byName.get('website') ?? '',
        instagram: byName.get('instagram') ?? '',
        vimeo: byName.get('vimeo') ?? '',
        language: byName.get('language') ?? '',
    };
}

function settingWrites(
    settings: AdditionalSettings,
    existing: UserSetting[],
): Array<{ name: UserSettingName; value: string }> {
    const additional = additionalSettingNames.flatMap((name) => {
        const value = settings[settingFields[name]].trim();
        return value ? [{ name, value }] : [];
    });
    return [...additional, ...keptSettings(existing, additionalSettingNames)];
}

function sameSettings(rows: UserSetting[], settings: AdditionalSettings): boolean {
    const current = readSettings(rows);
    return additionalSettingNames.every((name) => current[settingFields[name]] === settings[settingFields[name]].trim());
}

function readNotifications(rows: UserSetting[]): NotificationChoices {
    const byName = new Map(rows.map((row) => [row.name, row.value]));
    const choices = {} as NotificationChoices;
    for (const channel of Object.keys(notificationFields) as Array<keyof NotificationChoices>) {
        const fields = notificationFields[channel];
        const fallback = notificationDefaults[channel];
        choices[channel] = {
            email: readFlag(byName, fields.email, fallback.email),
            push: readFlag(byName, fields.push, fallback.push),
        };
    }
    return choices;
}

function notificationWrites(
    choices: NotificationChoices,
    existing: UserSetting[],
): Array<{ name: UserSettingName; value: string }> {
    const notifications = (Object.keys(notificationFields) as Array<keyof NotificationChoices>).flatMap((channel) => {
        const fields = notificationFields[channel];
        return [
            { name: fields.email, value: choices[channel].email ? 'true' : 'false' },
            { name: fields.push, value: choices[channel].push ? 'true' : 'false' },
        ];
    });
    return [...notifications, ...keptSettings(existing, notificationSettingNames)];
}

function keptSettings(
    existing: UserSetting[],
    replaced: readonly string[],
): Array<{ name: UserSettingName; value: string }> {
    const replacing = new Set<string>(replaced);
    return existing.flatMap((row) => {
        if (replacing.has(row.name) || !isUserSettingName(row.name)) {
            return [];
        }
        return [{ name: row.name, value: row.value }];
    });
}

function readFlag(rows: Map<string, string>, name: string, fallback: boolean): boolean {
    const value = rows.get(name);
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    return fallback;
}

function isUserSettingName(name: string): name is UserSettingName {
    return (userSettingNames as readonly string[]).includes(name);
}

function reportSave(
    message: ReturnType<typeof AntdApp.useApp>['message'],
    failures: string[],
    savedAny: boolean,
): void {
    if (failures.length > 0 && savedAny) {
        message.warning(failures.join(' '));
        return;
    }
    if (failures.length > 0) {
        message.error(failures.join(' '));
        return;
    }
    if (savedAny) {
        message.success('Saved changes.');
    }
}

function errorText(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

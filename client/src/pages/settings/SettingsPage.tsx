import {
    classifyMediaLink,
    mediaUrl,
    type Currency,
    type UserLocale,
    type UserMedia,
    type UserWorkProfile,
} from '@sugarcube/schema';
import { App as AntdApp, Button, ConfigProvider, Result, Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { ApiError } from '../../api/http.ts';
import {
    listCurrencies,
    listProductionCities,
    type ProductionCity,
} from '../../api/catalog.ts';
import { listMedia, updateMedia } from '../../api/media.ts';
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
import { AdditionalInfo, type AdditionalSaveInput } from './AdditionalInfo.tsx';
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
    PaymentsBilling,
    SubscriptionSettings,
} from './SettingsPanels.tsx';

type SettingsData = {
    cities: ProductionCity[];
    currencies: Currency[];
    locales: UserLocale[];
    workProfile: UserWorkProfile | null;
    vimeo: UserMedia | null;
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
                const [media, locales, cities, currencies, workProfile] = await Promise.all([
                    listMedia(accessToken),
                    listLocales(accessToken),
                    listProductionCities(accessToken),
                    listCurrencies(accessToken),
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
                    workProfile,
                    vimeo: media.find((item) => item.media_type === 'vimeo') ?? null,
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
            const bioChanged = input.bio !== (user.bio ?? '').trim();
            if (phoneChanged || bioChanged) {
                const title = user.title?.trim() ?? '';
                if (!title) {
                    failures.push('Add a title on your profile before saving your phone or bio.');
                } else {
                    try {
                        const saved = await saveBasic(token, { phone: input.phone, bio: input.bio, title });
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

            reportSave(message, failures, savedAny, null);
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
            if (input.cityId && input.cityId !== homeCityId(data.locales)) {
                try {
                    const locales = await saveHomeCity(token, data.locales, input.cityId);
                    setData((current) => current ? { ...current, locales } : current);
                    savedAny = true;
                } catch (error) {
                    failures.push(errorText(error, 'Could not save your city.'));
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

            const storedVimeo = data.vimeo ? (mediaUrl(data.vimeo) ?? '') : '';
            if (input.vimeoUrl && input.vimeoUrl !== storedVimeo && data.vimeo) {
                const link = classifyMediaLink(input.vimeoUrl);
                if (link && link.media_type === 'vimeo') {
                    try {
                        const saved = await updateMedia(token, data.vimeo.id, link.url);
                        setData((current) => current ? { ...current, vimeo: saved } : current);
                        savedAny = true;
                    } catch (error) {
                        failures.push(errorText(error, 'Could not update your Vimeo reel.'));
                    }
                }
            }

            const unstored = unstoredMessage(input.unstored);
            reportSave(message, failures, savedAny, unstored);
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

    const homeId = data ? homeCityId(data.locales) : null;
    const vimeoUrl = data?.vimeo ? (mediaUrl(data.vimeo) ?? '') : '';

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
            vimeoUrl,
            saving,
            savedAt,
            savedSection,
            onSavePersonal: (input, photo) => savePersonal(input, photo),
            onSaveAdditional: (input) => saveAdditional(input),
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
        vimeoUrl: string;
        saving: boolean;
        savedAt: Date | null;
        savedSection: SettingsSection | null;
        onSavePersonal: (input: PersonalSaveInput, photo: File | null) => Promise<PersonalSaveResult>;
        onSaveAdditional: (input: AdditionalSaveInput) => Promise<boolean>;
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
                cities={props.data.cities}
                currencies={props.data.currencies}
                cityId={props.homeId}
                currencyId={props.data.workProfile?.currency_id ?? null}
                currencyLocked={!props.data.workProfile || props.data.workProfile.day_rate === null}
                vimeoUrl={props.vimeoUrl}
                hasVimeo={props.data.vimeo !== null}
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
        return <NotificationSettings />;
    }
    if (section === 'security') {
        return <AccountSecurity user={props.user} />;
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

function reportSave(
    message: ReturnType<typeof AntdApp.useApp>['message'],
    failures: string[],
    savedAny: boolean,
    unstored: string | null,
): void {
    if (failures.length > 0 && savedAny) {
        message.warning(failures.join(' '));
        return;
    }
    if (failures.length > 0) {
        message.error(failures.join(' '));
        return;
    }
    if (savedAny && unstored) {
        message.success(`Saved changes. ${unstored}`);
        return;
    }
    if (savedAny) {
        message.success('Saved changes.');
        return;
    }
    if (unstored) {
        message.info(unstored);
    }
}

function unstoredMessage(names: string[]): string | null {
    if (names.length === 0) {
        return null;
    }
    if (names.length === 1) {
        return `${names[0]} isn't stored on your account.`;
    }
    const last = names[names.length - 1];
    return `${names.slice(0, -1).join(', ')} and ${last} aren't stored on your account.`;
}

function errorText(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

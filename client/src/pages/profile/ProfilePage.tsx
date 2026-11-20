import { ArrowLeftOutlined, ArrowRightOutlined, SendOutlined } from '@ant-design/icons';
import type { Project, UserMedia, WorkProfileChoice } from '@sugarcube/schema';
import { App as AntdApp, Button, ConfigProvider, Result, Spin, Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
    listCurrencies,
    listDisciplines,
    listPositions,
    listProductionCities,
    listProjectTypes,
} from '../../api/catalog.ts';
import { listAvailability } from '../../api/availability.ts';
import { listMedia } from '../../api/media.ts';
import {
    getProfilePhotoUrl,
    getWorkProfile,
    listLocales,
    listWorkProfiles,
    returnToStep,
    saveBasic,
    saveSetup,
    submitProfile,
    uploadProfilePhoto,
    viewWorkProfile,
} from '../../api/me.ts';
import { listProjectProjectTypes, listProjects } from '../../api/projects.ts';
import { Frame } from '../../components/Frame.tsx';
import { useAppDispatch, useAppSelector, useSession } from '../../store/hooks.ts';
import { profileLoaded } from '../../store/profileSlice.ts';
import { onboardingTheme } from '../../theme.ts';
import { AvailabilityCalendar } from '../onboarding/AvailabilityCalendar.tsx';
import { onboardingMediaPath } from '../onboarding/OnboardingMedia.tsx';
import { PastExperience } from './PastExperience.tsx';
import { ProfileAbout, ProfileStats } from './ProfileIdentity.tsx';
import { ProfileEditor } from './ProfileEditor.tsx';
import { ProfileHeader } from './ProfileHeader.tsx';
import { MediaPlayer } from './MediaPlayer.tsx';
import { profileMediaItemPath, profileMediaPath, profilePath } from './paths.ts';
import { ProfileMedia } from './ProfileMedia.tsx';
import {
    cityLine,
    disciplineOrder,
    formatPerDay,
    minimumMedia,
    orderNamed,
    readRate,
    workedOn,
    type ProfileEditValues,
    type ReviewData,
} from './profileModel.ts';

export { profileMediaItemPath, profileMediaPath, profilePath };

export type ProfilePageProps = {
    onboarding?: boolean;
    framed?: boolean;
};

export function ProfilePage({ onboarding = false, framed = true }: ProfilePageProps = {}) {
    const navigate = useNavigate();
    const location = useLocation();
    const playerId = readPlayerId(location.pathname);
    const playerOpen = playerId !== undefined;
    const dispatch = useAppDispatch();
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    const readOnly = user?.status === 'admin-review';
    const { message } = AntdApp.useApp();
    const [data, setData] = useState<ReviewData | null>(null);
    const [workProfiles, setWorkProfiles] = useState<WorkProfileChoice[]>([]);
    const [viewingId, setViewingId] = useState<string | null>(null);
    const [switchingProfile, setSwitchingProfile] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [returning, setReturning] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [editingProfile, setEditingProfile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
    const mediaRef = useRef<UserMedia[]>([]);
    const projectsRef = useRef<Project[]>([]);
    const selectedTypeIdsRef = useRef<string[]>([]);
    const writes = useRef(Promise.resolve());
    const saveQueue = useRef(Promise.resolve());

    useEffect(() => {
        if (onboarding) {
            return;
        }
        const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Profile';
        document.title = `${data?.title?.trim() || name} — CopyThat`;
    }, [data?.title, onboarding, user]);

    useEffect(() => {
        if (!session) {
            return;
        }

        const token = session.accessToken;
        let active = true;
        setData(null);
        setLoadError(null);

        void (async () => {
            try {
                const [media, projects, projectTypes, positions, currencies, cities, locales, rates, disciplines, availability, choices] = await Promise.all([
                    listMedia(token),
                    listProjects(token),
                    listProjectTypes(token),
                    listPositions(token),
                    listCurrencies(token),
                    listProductionCities(token),
                    listLocales(token),
                    getWorkProfile(token),
                    listDisciplines(token),
                    listAvailability(token),
                    listWorkProfiles(token),
                ]);
                const links = await Promise.all(projects.map((project) => listProjectProjectTypes(token, project.id)));
                if (!active) {
                    return;
                }
                const home = locales.find((locale) => locale.home_city) ?? null;
                const orderedLocales = [
                    ...(home ? [home] : []),
                    ...locales.filter((locale) => locale !== home),
                ];
                const typeIds = [...new Set(links.flat().map((link) => link.project_type_id))];
                mediaRef.current = media;
                projectsRef.current = projects;
                selectedTypeIdsRef.current = typeIds;
                setSelectedTypeIds(typeIds);
                setWorkProfiles(choices);
                setViewingId(rates.id);
                setData({
                    media,
                    projects,
                    projectTypes,
                    disciplines: orderNamed(disciplines, disciplineOrder),
                    positions,
                    currencies,
                    cities,
                    disciplineId: rates.discipline_id ?? '',
                    positionId: rates.position_id ?? '',
                    unionStatus: rates.union_status,
                    dayRate: rates.day_rate,
                    currencyId: rates.currency_id,
                    flatFee: rates.flat_fee,
                    projectsCompleted: rates.projects_completed,
                    yearsInBusiness: rates.years_in_business,
                    responseTimeHours: rates.response_time_hours,
                    locales: orderedLocales.map((locale) => ({
                        production_city_id: locale.production_city_id,
                        home_city: locale.home_city,
                    })),
                    availability,
                    bio: rates.bio,
                    title: rates.title,
                });
            } catch (error: unknown) {
                if (active) {
                    setLoadError(error instanceof Error ? error.message : 'Could not load your profile.');
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [attempt, session]);

    useEffect(() => {
        if (!session || !user?.photo) {
            setPhotoUrl(null);
            return;
        }

        const token = session.accessToken;
        let active = true;
        setPhotoUrl(null);
        void getProfilePhotoUrl(token).then((link) => {
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
    }, [session, user?.photo]);

    function rememberMedia(next: UserMedia[]): void {
        mediaRef.current = next;
        setData((current) => current ? { ...current, media: next } : current);
    }

    function rememberProjects(next: Project[]): void {
        projectsRef.current = next;
        setData((current) => current ? { ...current, projects: next } : current);
    }

    function rememberTypeIds(typeIds: string[]): void {
        selectedTypeIdsRef.current = typeIds;
        setSelectedTypeIds(typeIds);
    }

    async function onBack(): Promise<void> {
        if (!session || returning) {
            return;
        }

        setReturning(true);
        try {
            await writes.current;
            await saveQueue.current;
            const updated = await returnToStep(session.accessToken, 'media');
            dispatch(profileLoaded({ user: updated, forSubject: session.profile.subject }));
            navigate(onboardingMediaPath);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not go back.');
        } finally {
            setReturning(false);
        }
    }

    async function onViewProfile(id: string): Promise<void> {
        if (!session || switchingProfile || id === viewingId) {
            return;
        }

        setSwitchingProfile(true);
        setEditingProfile(false);
        try {
            await viewWorkProfile(session.accessToken, id);
            setAttempt((value) => value + 1);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not switch profiles.');
        } finally {
            setSwitchingProfile(false);
        }
    }

    async function onSubmit(): Promise<void> {
        if (!session || submitting) {
            return;
        }

        setSubmitting(true);
        try {
            await writes.current;
            await saveQueue.current;
            const updated = await submitProfile(session.accessToken);
            dispatch(profileLoaded({ user: updated, forSubject: session.profile.subject }));
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not submit your profile.');
        } finally {
            setSubmitting(false);
        }
    }

    async function onSaveProfile(values: ProfileEditValues, photoFile: File | null): Promise<void> {
        if (!session) {
            return;
        }
        const dayRate = readRate(values.day_rate);
        if (dayRate === null) {
            return;
        }

        setSavingProfile(true);
        try {
            if (photoFile) {
                const withPhoto = await uploadProfilePhoto(session.accessToken, photoFile);
                dispatch(profileLoaded({ user: withPhoto, forSubject: session.profile.subject }));
            }
            const saved = await saveBasic(session.accessToken, {
                phone: values.phone.trim(),
                bio: values.bio.trim(),
                title: values.title.trim(),
            });
            dispatch(profileLoaded({ user: saved, forSubject: session.profile.subject }));
            const rounded = Math.round(dayRate * 100) / 100;
            const updated = await saveSetup(session.accessToken, {
                discipline_id: values.discipline_id,
                position_id: values.position_id,
                day_rate: rounded,
                currency_id: values.currency_id,
                union_status: values.union_status,
                flat_fee: values.flat_fee,
                cities: values.locales,
            });
            dispatch(profileLoaded({ user: updated, forSubject: session.profile.subject }));
            setData((current) => current ? {
                ...current,
                disciplineId: values.discipline_id,
                positionId: values.position_id,
                unionStatus: values.union_status,
                dayRate: rounded,
                currencyId: values.currency_id,
                flatFee: values.flat_fee,
                locales: values.locales,
                bio: values.bio.trim(),
                title: values.title.trim(),
            } : current);
            setEditingProfile(false);
            message.success('Profile updated.');
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not update your profile.');
        } finally {
            setSavingProfile(false);
        }
    }

    async function onShareProfile(): Promise<void> {
        try {
            await navigator.clipboard.writeText(window.location.href);
            message.success('Profile link copied.');
        } catch {
            message.error('Could not copy the profile link.');
        }
    }

    useEffect(() => {
        if (!playerOpen || !data) {
            return;
        }
        if (data.media.length === 0) {
            navigate(profilePath, { replace: true });
            return;
        }
        if (playerId && data.media.some((item) => item.id === playerId)) {
            return;
        }
        const first = data.media[0];
        if (first) {
            navigate(profileMediaItemPath(first.id), { replace: true });
        }
    }, [data, navigate, playerId, playerOpen]);

    const closePlayer = useCallback((): void => {
        const index = historyIndex();
        if (index !== null && index > 0) {
            navigate(-1);
            return;
        }
        navigate(profilePath, { replace: true });
    }, [navigate]);

    const selectPlayer = useCallback((id: string): void => {
        navigate(profileMediaItemPath(id), { replace: true });
    }, [navigate]);

    useEffect(() => {
        if (!playerOpen) {
            return;
        }
        const bar = document.querySelector('.app-bar');
        if (!(bar instanceof HTMLElement)) {
            return;
        }
        bar.inert = true;
        return () => {
            bar.inert = false;
        };
    }, [playerOpen]);

    const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Your profile';
    const heading = data?.title?.trim() || displayName;
    const positionName = data ? data.positions.find((position) => position.id === data.positionId)?.name ?? null : null;
    const disciplineName = data ? data.disciplines.find((discipline) => discipline.id === data.disciplineId)?.name ?? null : null;
    const playerRole = [positionName, disciplineName].filter((part): part is string => Boolean(part)).join(' — ');
    const soleProject = data?.projects.length === 1 ? data.projects[0] ?? null : null;
    const projectPosition = soleProject
        ? data?.positions.find((position) => position.id === soleProject.position_id)?.name ?? null
        : null;
    const playerCaption = soleProject?.name ?? null;
    const playerDetail = soleProject
        ? [projectPosition, monthYear(soleProject.date)].filter((part): part is string => Boolean(part)).join(' · ')
        : null;
    const playerItem = playerOpen && data && playerId
        ? data.media.find((item) => item.id === playerId) ?? null
        : null;
    const subtitle = data ? workedOn(data.projects.map((project) => project.name)) : null;
    const currency = data?.currencies.find((row) => row.id === data.currencyId);
    const rateLabel = data ? formatPerDay(data.dayRate, currency) : null;
    const role = [positionName, rateLabel].filter((part): part is string => Boolean(part)).join(' · ');
    const where = data ? cityLine(data.locales, data.cities) : null;
    const homeLocale = data?.locales.find((locale) => locale.home_city) ?? data?.locales[0];
    const homeCity = data?.cities.find((city) => city.id === homeLocale?.production_city_id)?.name ?? null;
    const appliesTo = [positionName, homeCity].filter((part): part is string => Boolean(part)).join(' · ');
    const viewingLabel = [positionName, homeCity].filter((part): part is string => Boolean(part)).join(' · ');
    const liveProfiles = workProfiles.filter((profile) => profile.status === 'live');
    const canSwitchProfiles = liveProfiles.length > 1;
    const calendarRate = readOnly && rateLabel
        ? [rateLabel, positionName].filter((part): part is string => Boolean(part)).join(' · ')
        : null;
    const canSubmit = (data?.media.length ?? 0) >= minimumMedia;

    const review = (
        <>
            {loadError ? (
                <Result
                    status="error"
                    title="Could not load your profile"
                    subTitle={loadError}
                    extra={(
                        <Button type="primary" onClick={() => setAttempt((value) => value + 1)}>
                            Try again
                        </Button>
                    )}
                />
            ) : !data || !user || !session ? (
                <Spin size="large" description="Loading your profile…" />
            ) : (
                <div
                    className={readOnly ? 'crew-profile is-review is-readonly' : 'crew-profile is-review'}
                    inert={playerOpen ? true : undefined}
                >
                    <div className="crew-main">
                        <ProfileHeader
                            readOnly={readOnly}
                            heading={heading}
                            subtitle={subtitle}
                            showActions={!readOnly && !editingProfile}
                            viewingLabel={viewingLabel}
                            canSwitchProfiles={canSwitchProfiles}
                            choices={liveProfiles}
                            viewingId={viewingId}
                            switching={switchingProfile}
                            onShare={() => {
                                void onShareProfile();
                            }}
                            onViewProfile={(id) => {
                                void onViewProfile(id);
                            }}
                        />
                        <ProfileMedia
                            readOnly={readOnly}
                            media={data.media}
                            accessToken={session.accessToken}
                            mediaRef={mediaRef}
                            writes={writes}
                            onMedia={rememberMedia}
                            onReload={() => setAttempt((value) => value + 1)}
                        />
                        <div className="review-columns">
                            <div>
                                {!readOnly && editingProfile ? (
                                    <ProfileEditor
                                        data={data}
                                        user={user}
                                        photoUrl={photoUrl}
                                        saving={savingProfile}
                                        onCancel={() => setEditingProfile(false)}
                                        onSave={(values, photoFile) => void onSaveProfile(values, photoFile)}
                                    />
                                ) : (
                                    <ProfileAbout
                                        readOnly={readOnly}
                                        displayName={displayName}
                                        photoUrl={photoUrl}
                                        onPhotoError={() => setPhotoUrl(null)}
                                        firstName={user.first_name}
                                        lastName={user.last_name}
                                        unionStatus={data.unionStatus}
                                        role={role}
                                        where={where}
                                        bio={data.bio}
                                        onEdit={() => setEditingProfile(true)}
                                    />
                                )}
                                <ProfileStats
                                    projectsCompleted={data.projectsCompleted}
                                    responseTimeHours={data.responseTimeHours}
                                    yearsInBusiness={data.yearsInBusiness}
                                    cityCount={data.locales.length}
                                />
                                <PastExperience
                                    readOnly={readOnly}
                                    projects={data.projects}
                                    disciplines={data.disciplines}
                                    positions={data.positions}
                                    projectTypes={data.projectTypes}
                                    selectedTypeIds={selectedTypeIds}
                                    accessToken={session.accessToken}
                                    projectsRef={projectsRef}
                                    selectedTypeIdsRef={selectedTypeIdsRef}
                                    saveQueue={saveQueue}
                                    onProjects={rememberProjects}
                                    onTypeIds={rememberTypeIds}
                                />
                                {onboarding && !readOnly && !canSubmit ? (
                                    <p className="review-minimum">Add at least 2 items before you submit.</p>
                                ) : null}
                                {onboarding && !readOnly ? (
                                    <div className="review-submit-row">
                                        <Button
                                            htmlType="button"
                                            className="review-back"
                                            icon={<ArrowLeftOutlined />}
                                            loading={returning}
                                            disabled={submitting}
                                            onClick={() => void onBack()}
                                        >
                                            Go back
                                        </Button>
                                        <Button
                                            type="primary"
                                            htmlType="button"
                                            className="review-submit"
                                            loading={submitting}
                                            disabled={!canSubmit}
                                            onClick={() => void onSubmit()}
                                        >
                                            <SendOutlined aria-hidden />
                                            Submit profile
                                            <ArrowRightOutlined aria-hidden />
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                            <div className="review-rail">
                                <AvailabilityCalendar
                                    rows={data.availability}
                                    appliesTo={appliesTo}
                                    editable
                                    legend={readOnly ? 'none' : 'status'}
                                    rateLabel={calendarRate}
                                    accessToken={session.accessToken}
                                    onSaved={(availability) => {
                                        setData((current) => current ? { ...current, availability } : current);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {playerItem && session ? (
                <MediaPlayer
                    media={data?.media ?? []}
                    mediaId={playerItem.id}
                    accessToken={session.accessToken}
                    name={displayName}
                    role={playerRole}
                    captionTitle={playerCaption}
                    captionDetail={playerDetail}
                    onClose={closePlayer}
                    onSelect={selectPlayer}
                />
            ) : null}

            {onboarding ? (
                <Typography.Paragraph className="review-footnote">
                    Review takes ~24h — you'll show as “Pending review” until approved.
                </Typography.Paragraph>
            ) : null}
        </>
    );

    if (onboarding) {
        return review;
    }

    const sheet = (
        <ConfigProvider theme={onboardingTheme}>
            <div className="review-sheet">{review}</div>
        </ConfigProvider>
    );
    return framed ? <Frame>{sheet}</Frame> : sheet;
}

function readPlayerId(pathname: string): string | null | undefined {
    if (pathname === profileMediaPath) {
        return null;
    }
    const prefix = `${profileMediaPath}/`;
    if (!pathname.startsWith(prefix)) {
        return undefined;
    }
    try {
        const id = decodeURIComponent(pathname.slice(prefix.length).split('/')[0] ?? '');
        return id || null;
    } catch {
        return null;
    }
}

function monthYear(iso: string): string | null {
    const date = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function historyIndex(): number | null {
    const state = window.history.state as { idx?: unknown } | null;
    return typeof state?.idx === 'number' ? state.idx : null;
}

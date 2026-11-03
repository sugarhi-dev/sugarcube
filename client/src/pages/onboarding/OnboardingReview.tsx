import {
    ArrowLeftOutlined,
    ArrowRightOutlined,
    CameraOutlined,
    CaretRightFilled,
    CheckOutlined,
    DeleteOutlined,
    EditOutlined,
    EnvironmentOutlined,
    LinkOutlined,
    MailOutlined,
    PhoneOutlined,
    PictureOutlined,
    PlaySquareOutlined,
    PlusOutlined,
    SendOutlined,
    UploadOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import { classifyMediaLink, mediaUrl, type Currency, type Project, type ProjectType, type UserMedia } from '@sugarcube/schema';
import { App as AntdApp, Button, Flex, Form, Input, InputNumber, Modal, Progress, Radio, Result, Select, Spin, Switch, Typography } from 'antd';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
    listCurrencies,
    listDisciplines,
    listPositions,
    listProductionCities,
    listProjectTypes,
    type Discipline,
    type Position,
    type ProductionCity,
} from '../../api/catalog.ts';
import { createMedia, deleteMedia, getMediaThumbnail, listMedia, updateMedia, uploadMedia } from '../../api/media.ts';
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
    type SetupCity,
    type UnionStatus,
} from '../../api/me.ts';
import {
    createProject,
    deleteProject,
    listProjectProjectTypes,
    listProjects,
    updateProject,
    updateProjectProjectTypes,
} from '../../api/projects.ts';
import { useAppDispatch, useAppSelector, useSession } from '../../store/hooks.ts';
import { profileLoaded } from '../../store/profileSlice.ts';
import { copyThat } from '../../theme.ts';
import { LocaleField } from './LocaleField.tsx';
import { OnboardingFrame } from './OnboardingFrame.tsx';
import { onboardingMediaPath } from './OnboardingMedia.tsx';

export const onboardingReviewPath = '/onboarding/review';

const minimumMedia = 2;
const bioLimit = 300;
const thumbnailLimit = 8 * 1024 * 1024;
const videoLimit = 200 * 1024 * 1024;

const unionOptions: Array<{ value: UnionStatus; label: string }> = [
    { value: 'union', label: 'Union' },
    { value: 'non_union', label: 'Non-Union' },
    { value: 'either', label: 'Either' },
];

const unionLabels: Record<UnionStatus, string> = {
    union: 'Union',
    non_union: 'Non-Union',
    either: 'Either',
};

const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
};

const disciplineOrder = ['Shooting', 'Post Production'];

const typeOrder: Record<string, string[]> = {
    Shooting: [
        'Social Content',
        'Podcast',
        'Product Demo',
        'Brand Film',
        'Tabletop',
        'Music Video',
        'Feature Film',
        'Indie Film',
        'TV Show',
        'Longform Art Film',
        'Still Photography',
        'Commercial',
    ],
    'Post Production': ['Stop Motion', 'Animated', 'Visual FX', 'AI Content'],
};

type ReviewData = {
    media: UserMedia[];
    projects: Project[];
    projectTypes: ProjectType[];
    disciplines: Discipline[];
    positions: Position[];
    currencies: Currency[];
    cities: ProductionCity[];
    disciplineId: string;
    positionId: string;
    unionStatus: UnionStatus;
    dayRate: number | null;
    currencyId: string | null;
    flatFee: boolean;
    locales: SetupCity[];
};

type ProfileEditValues = {
    phone: string;
    bio: string;
    discipline_id: string;
    position_id: string;
    day_rate: number | string | null;
    currency_id: string;
    union_status: UnionStatus;
    flat_fee: boolean;
    locales: SetupCity[];
};

type CreditFormValues = {
    name: string;
    position_id: string;
    lead_producer_name: string;
};

export function OnboardingReview() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    const readOnly = user?.status === 'admin-review';
    const { message } = AntdApp.useApp();
    const [data, setData] = useState<ReviewData | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [returning, setReturning] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [showAllMedia, setShowAllMedia] = useState(false);
    const [editingProfile, setEditingProfile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoType, setVideoType] = useState<string | null>(null);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadPercent, setUploadPercent] = useState(0);
    const [link, setLink] = useState('');
    const [linkError, setLinkError] = useState<string | null>(null);
    const [thumbFile, setThumbFile] = useState<File | null>(null);
    const [thumbPreview, setThumbPreview] = useState<string | null>(null);
    const [thumbError, setThumbError] = useState<string | null>(null);
    const [addingMedia, setAddingMedia] = useState(false);
    const [removingMediaId, setRemovingMediaId] = useState<string | null>(null);
    const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
    const [editUrl, setEditUrl] = useState('');
    const [editError, setEditError] = useState<string | null>(null);
    const [savingMediaId, setSavingMediaId] = useState<string | null>(null);
    const [creditForm] = Form.useForm<CreditFormValues>();
    const [addingCredit, setAddingCredit] = useState(false);
    const [editingCreditId, setEditingCreditId] = useState<string | null>(null);
    const [savingCreditId, setSavingCreditId] = useState<string | null>(null);
    const [removingCreditId, setRemovingCreditId] = useState<string | null>(null);
    const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
    const mediaRef = useRef<UserMedia[]>([]);
    const projectsRef = useRef<Project[]>([]);
    const selectedTypeIdsRef = useRef<string[]>([]);
    const writes = useRef(Promise.resolve());
    const saveQueue = useRef(Promise.resolve());
    const thumbRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLInputElement>(null);
    const uploadThumbRef = useRef<HTMLInputElement>(null);
    const uploadAbort = useRef<AbortController | null>(null);

    useEffect(() => {
        document.title = readOnly ? 'Profile in review' : 'Review & go live';
    }, [readOnly]);

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
                const [media, projects, projectTypes, positions, currencies, cities, locales, rates, workProfiles, disciplines] = await Promise.all([
                    listMedia(token),
                    listProjects(token),
                    listProjectTypes(token),
                    listPositions(token),
                    listCurrencies(token),
                    listProductionCities(token),
                    listLocales(token),
                    getWorkProfile(token),
                    listWorkProfiles(token),
                    listDisciplines(token),
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
                const work = workProfiles[0];
                const typeIds = [...new Set(links.flat().map((link) => link.project_type_id))];
                mediaRef.current = media;
                projectsRef.current = projects;
                selectedTypeIdsRef.current = typeIds;
                setSelectedTypeIds(typeIds);
                setData({
                    media,
                    projects,
                    projectTypes,
                    disciplines: orderNamed(disciplines, disciplineOrder),
                    positions,
                    currencies,
                    cities,
                    disciplineId: work?.discipline_id ?? '',
                    positionId: work?.position_id ?? '',
                    unionStatus: rates.union_status,
                    dayRate: rates.day_rate,
                    currencyId: rates.currency_id,
                    flatFee: rates.flat_fee,
                    locales: orderedLocales.map((locale) => ({
                        production_city_id: locale.production_city_id,
                        home_city: locale.home_city,
                    })),
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

    useEffect(() => {
        if (!thumbFile) {
            setThumbPreview(null);
            return;
        }
        const url = URL.createObjectURL(thumbFile);
        setThumbPreview(url);
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [thumbFile]);

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

    function enqueue(task: () => Promise<void>): void {
        writes.current = writes.current.then(task, task).catch((error: unknown) => {
            message.error(error instanceof Error ? error.message : 'Could not save your media.');
            setAttempt((value) => value + 1);
        });
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
            } : current);
            setEditingProfile(false);
            message.success('Profile updated.');
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not update your profile.');
        } finally {
            setSavingProfile(false);
        }
    }

    function openLinkDialog(): void {
        if (uploading) {
            return;
        }
        setLink('');
        setLinkError(null);
        setThumbFile(null);
        setThumbError(null);
        setUploadOpen(false);
        setLinkOpen(true);
    }

    function openUploadDialog(): void {
        if (uploading) {
            return;
        }
        setVideoFile(null);
        setVideoType(null);
        setVideoError(null);
        setThumbFile(null);
        setThumbError(null);
        setUploadPercent(0);
        setUploadOpen(true);
    }

    function chooseVideo(file: File): void {
        const contentType = videoContentType(file);
        if (!contentType) {
            setVideoFile(null);
            setVideoType(null);
            setVideoError('Use an MP4, MOV, or WebM video.');
            return;
        }
        if (file.size > videoLimit) {
            setVideoFile(null);
            setVideoType(null);
            setVideoError('Use a video smaller than 200 MB.');
            return;
        }
        setVideoError(null);
        setVideoType(contentType);
        setVideoFile(file);
    }

    async function chooseThumbnail(file: File): Promise<void> {
        if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
            setThumbError('Use a JPG or PNG thumbnail.');
            return;
        }
        if (file.size > thumbnailLimit) {
            setThumbError('Use a thumbnail smaller than 8 MB.');
            return;
        }
        try {
            const bitmap = await createImageBitmap(file);
            bitmap.close();
        } catch {
            setThumbError('Could not read that thumbnail.');
            return;
        }
        setThumbError(null);
        setThumbFile(file);
    }

    async function onAddLink(): Promise<void> {
        if (!session || addingMedia) {
            return;
        }
        const parsed = classifyMediaLink(link);
        if (!parsed) {
            setLinkError('Paste a YouTube or Vimeo link.');
            return;
        }
        if (!thumbFile) {
            setThumbError('Choose a JPG or PNG thumbnail.');
            return;
        }

        setLinkError(null);
        setThumbError(null);
        setAddingMedia(true);
        try {
            await writes.current;
            const created = await createMedia(session.accessToken, parsed.url, thumbFile);
            rememberMedia([...mediaRef.current, created]);
            setLinkOpen(false);
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : 'Could not add that video.');
        } finally {
            setAddingMedia(false);
        }
    }

    async function onUpload(): Promise<void> {
        if (!session || uploading || !videoFile || !videoType) {
            return;
        }
        if (!thumbFile) {
            setThumbError('Choose a JPG or PNG thumbnail.');
            return;
        }

        const controller = new AbortController();
        uploadAbort.current = controller;
        setVideoError(null);
        setUploadPercent(0);
        setUploading(true);
        try {
            await writes.current;
            const created = await uploadMedia(
                session.accessToken,
                videoFile,
                videoType,
                thumbFile,
                setUploadPercent,
                controller.signal,
            );
            rememberMedia([...mediaRef.current, created]);
            setUploadOpen(false);
        } catch (error: unknown) {
            if (isAbort(error)) {
                setUploadOpen(false);
                return;
            }
            message.error(error instanceof Error ? error.message : 'Could not upload that video.');
        } finally {
            uploadAbort.current = null;
            setUploading(false);
        }
    }

    function closeUpload(): void {
        if (uploading) {
            uploadAbort.current?.abort();
            return;
        }
        setUploadOpen(false);
    }

    function onRemoveMedia(id: string): void {
        if (!session || removingMediaId) {
            return;
        }
        const token = session.accessToken;
        if (editingMediaId === id) {
            setEditingMediaId(null);
        }
        rememberMedia(mediaRef.current.filter((item) => item.id !== id));
        setRemovingMediaId(id);
        enqueue(async () => {
            try {
                await deleteMedia(token, id);
            } finally {
                setRemovingMediaId((current) => current === id ? null : current);
            }
        });
    }

    function onEditMedia(item: UserMedia): void {
        setEditingMediaId(item.id);
        setEditUrl(mediaUrl(item) ?? '');
        setEditError(null);
    }

    async function onSaveMedia(id: string): Promise<void> {
        if (!session || savingMediaId) {
            return;
        }
        const parsed = classifyMediaLink(editUrl);
        if (!parsed) {
            setEditError('Paste a YouTube or Vimeo link.');
            return;
        }

        const token = session.accessToken;
        setSavingMediaId(id);
        setEditError(null);
        try {
            await writes.current;
            const saved = await updateMedia(token, id, parsed.url);
            rememberMedia(mediaRef.current.map((item) => item.id === id ? saved : item));
            setEditingMediaId((current) => current === id ? null : current);
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : 'Could not update that video.');
        } finally {
            setSavingMediaId((current) => current === id ? null : current);
        }
    }

    async function onAddCredit(values: CreditFormValues): Promise<void> {
        if (!session) {
            return;
        }
        setAddingCredit(true);
        try {
            const project = await createProject(session.accessToken, {
                name: values.name.trim(),
                position_id: values.position_id,
                lead_producer_name: values.lead_producer_name.trim(),
            });
            rememberProjects([...projectsRef.current, project]);
            creditForm.resetFields();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not add that project.');
            setAddingCredit(false);
            return;
        }
        try {
            await persistTypes(saveQueue, projectsRef, selectedTypeIdsRef, session.accessToken);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not update project types.');
        } finally {
            setAddingCredit(false);
        }
    }

    async function onSaveCredit(project: Project, values: CreditFormValues): Promise<void> {
        if (!session) {
            return;
        }
        setSavingCreditId(project.id);
        try {
            const updated = await updateProject(session.accessToken, project.id, {
                name: values.name.trim(),
                position_id: values.position_id,
                lead_producer_name: values.lead_producer_name.trim(),
            });
            rememberProjects(projectsRef.current.map((row) => row.id === updated.id ? updated : row));
            setEditingCreditId(null);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not update that project.');
        } finally {
            setSavingCreditId(null);
        }
    }

    async function onRemoveCredit(project: Project): Promise<void> {
        if (!session) {
            return;
        }
        setRemovingCreditId(project.id);
        try {
            await saveQueue.current;
            await deleteProject(session.accessToken, project.id);
            setEditingCreditId((current) => current === project.id ? null : current);
            rememberProjects(projectsRef.current.filter((row) => row.id !== project.id));
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not remove that project.');
        } finally {
            setRemovingCreditId(null);
        }
    }

    function toggleType(id: string): void {
        if (!session) {
            return;
        }
        const current = selectedTypeIdsRef.current;
        const next = current.includes(id) ? current.filter((row) => row !== id) : [...current, id];
        rememberTypeIds(next);
        const token = session.accessToken;
        void persistTypes(saveQueue, projectsRef, selectedTypeIdsRef, token).catch((error: unknown) => {
            message.error(error instanceof Error ? error.message : 'Could not update project types.');
        });
    }

    const accountLabel = user?.account_type === 'client' ? 'CLIENT SETUP' : 'CREW SETUP';
    const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Your profile';
    const positionName = data ? data.positions.find((position) => position.id === data.positionId)?.name ?? null : null;
    const title = positionName ?? displayName;
    const subtitle = data ? workedOn(data.projects.map((project) => project.name)) : null;
    const currency = data?.currencies.find((row) => row.id === data.currencyId);
    const rateLabel = data ? formatPerDay(data.dayRate, currency) : null;
    const role = [positionName, rateLabel].filter((part): part is string => Boolean(part)).join(' · ');
    const where = data ? cityLine(data.locales, data.cities) : null;
    const visibleMedia = data && !showAllMedia ? data.media.slice(0, 4) : data?.media ?? [];
    const moreMedia = Boolean(data && data.media.length > 4 && !showAllMedia);
    const mosaic = !showAllMedia && visibleMedia.length >= 3;
    const mediaClass = showAllMedia
        ? 'crew-media is-expanded'
        : mosaic
            ? 'crew-media'
            : visibleMedia.length === 1
                ? 'crew-media is-single'
                : 'crew-media is-pair';
    const canSubmit = (data?.media.length ?? 0) >= minimumMedia;
    const positionOptions = data ? positionSelectOptions(data.disciplines, data.positions) : [];
    const groups = data ? typeGroups(data.disciplines, data.projectTypes) : [];
    const typeName = new Map(data?.projectTypes.map((projectType) => [projectType.id, projectType.name]));
    const positionById = new Map(data?.positions.map((position) => [position.id, position.name]));

    return (
        <OnboardingFrame
            step={readOnly ? 6 : 5}
            accountLabel={accountLabel}
            contentWidth={960}
            note="Once approved you go Live — same dashboard as every account, plus your crew profile."
        >
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
                <div className={readOnly ? 'crew-profile is-review is-readonly' : 'crew-profile is-review'}>
                    <div className="crew-main">
                        {readOnly ? (
                            <p className="review-in-review" role="status">
                                Your profile is in review. An administrator will approve it before you go live.
                            </p>
                        ) : null}
                        <div className="crew-intro">
                            <div>
                                <h1>{title}</h1>
                                {subtitle ? <p>{subtitle}</p> : null}
                            </div>
                            {!readOnly && !editingProfile ? (
                                <div className="crew-actions">
                                    <Button htmlType="button" className="review-edit" onClick={() => setEditingProfile(true)}>
                                        Edit profile
                                    </Button>
                                </div>
                            ) : null}
                        </div>

                        {visibleMedia.length > 0 ? (
                            <div className={mediaClass}>
                                {visibleMedia.map((item, index) => {
                                    const label = mediaLabel(item, index, visibleMedia.length);
                                    const embed = embedSrc(item);
                                    return (
                                        <div key={item.id} className={mosaic && index === 0 ? 'crew-tile crew-tile-hero' : 'crew-tile'}>
                                            {embed ? (
                                                <MediaEmbed
                                                    src={embed}
                                                    id={item.id}
                                                    accessToken={session.accessToken}
                                                    label={label}
                                                />
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="crew-tile-open"
                                                    aria-label={index === 0 ? 'Play video' : 'Open video'}
                                                    onClick={() => openMedia(item, message)}
                                                >
                                                    <MediaThumb id={item.id} accessToken={session.accessToken} />
                                                    {index === 0 ? (
                                                        <span className="crew-play" aria-hidden="true">
                                                            <CaretRightFilled />
                                                        </span>
                                                    ) : null}
                                                </button>
                                            )}
                                            {readOnly ? null : (
                                                <div className="crew-tile-tools">
                                                    <button
                                                        type="button"
                                                        className="crew-tile-tool"
                                                        aria-label={`Edit ${label}`}
                                                        onClick={() => onEditMedia(item)}
                                                    >
                                                        <EditOutlined />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="crew-tile-tool"
                                                        aria-label={`Delete ${label}`}
                                                        disabled={removingMediaId === item.id}
                                                        onClick={() => onRemoveMedia(item.id)}
                                                    >
                                                        <DeleteOutlined />
                                                    </button>
                                                </div>
                                            )}
                                            {moreMedia && index === visibleMedia.length - 1 ? (
                                                <button type="button" className="crew-show-all" onClick={() => setShowAllMedia(true)}>
                                                    Show all media
                                                </button>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="crew-media-empty">No media yet</div>
                        )}
                        {showAllMedia && data.media.length > 4 ? (
                            <button type="button" className="crew-show-less" onClick={() => setShowAllMedia(false)}>
                                Show less
                            </button>
                        ) : null}
                        {readOnly ? null : (
                            <div className="review-media-actions">
                                <Button htmlType="button" className="media-upload" icon={<UploadOutlined />} onClick={openUploadDialog}>
                                    Upload
                                </Button>
                                <Button htmlType="button" className="media-add" icon={<LinkOutlined />} onClick={openLinkDialog}>
                                    YouTube / Vimeo
                                </Button>
                            </div>
                        )}

                        {editingProfile ? (
                            <ProfileEditor
                                data={data}
                                user={user}
                                photoUrl={photoUrl}
                                saving={savingProfile}
                                onCancel={() => setEditingProfile(false)}
                                onSave={(values, photoFile) => void onSaveProfile(values, photoFile)}
                            />
                        ) : (
                            <>
                                <div className="crew-identity">
                                    <span className="crew-avatar" aria-hidden="true">
                                        {photoUrl ? <img src={photoUrl} alt="" onError={() => setPhotoUrl(null)} /> : initials(user.first_name, user.last_name)}
                                    </span>
                                    <div>
                                        <div className="crew-name-row">
                                            <h2>{displayName}</h2>
                                            <span className="crew-union">{unionLabels[data.unionStatus]}</span>
                                        </div>
                                        {role ? <p className="crew-role">{role}</p> : null}
                                        {where ? (
                                            <p className="crew-where">
                                                <EnvironmentOutlined aria-hidden="true" />
                                                {where}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                {user.bio ? (
                                    <section className="crew-about" aria-labelledby="crew-about-title">
                                        <h2 id="crew-about-title">About</h2>
                                        <p>{user.bio}</p>
                                    </section>
                                ) : null}
                            </>
                        )}

                        <div className="crew-stats">
                            <div className="crew-stat">
                                <strong>{data.projects.length}</strong>
                                <span>Projects completed</span>
                            </div>
                        </div>

                        <section className="crew-panel" aria-labelledby="crew-experience-title">
                            <div className="crew-panel-head">
                                <h2 id="crew-experience-title">Past experience</h2>
                            </div>
                            {data.projects.length === 0 ? (
                                <p className="review-empty-copy">
                                    {readOnly ? 'No credits yet.' : 'Add a credit so clients can see where you have worked.'}
                                </p>
                            ) : (
                                <ul className="crew-credits">
                                    {data.projects.map((project) => {
                                        const detail = creditDetail(project, positionById, selectedTypeIds, typeName);
                                        return !readOnly && editingCreditId === project.id ? (
                                            <li key={project.id} className="crew-credit is-editing">
                                                <Form
                                                    className="review-credit-form"
                                                    requiredMark={false}
                                                    initialValues={{
                                                        name: project.name,
                                                        position_id: project.position_id,
                                                        lead_producer_name: project.lead_producer_name,
                                                    }}
                                                    onFinish={(values: CreditFormValues) => void onSaveCredit(project, values)}
                                                >
                                                    <Form.Item
                                                        name="name"
                                                        style={{ marginBottom: 8 }}
                                                        rules={[{ required: true, whitespace: true, message: 'Enter a project title.' }]}
                                                    >
                                                        <Input
                                                            autoFocus
                                                            aria-label={`Project title for ${project.name}`}
                                                            maxLength={255}
                                                        />
                                                    </Form.Item>
                                                    <Flex gap={8} wrap="wrap" align="flex-start">
                                                        <Form.Item
                                                            name="position_id"
                                                            style={{ flex: '1 1 180px', marginBottom: 0 }}
                                                            rules={[{ required: true, message: 'Choose a position.' }]}
                                                        >
                                                            <Select
                                                                showSearch
                                                                popupMatchSelectWidth={false}
                                                                aria-label={`Position for ${project.name}`}
                                                                placeholder="Position"
                                                                optionFilterProp="label"
                                                                options={positionOptions}
                                                            />
                                                        </Form.Item>
                                                        <Form.Item
                                                            name="lead_producer_name"
                                                            style={{ flex: '1 1 180px', marginBottom: 0 }}
                                                            rules={[{ required: true, whitespace: true, message: 'Enter the lead producer.' }]}
                                                        >
                                                            <Input aria-label={`Lead producer for ${project.name}`} />
                                                        </Form.Item>
                                                        <Button
                                                            htmlType="submit"
                                                            type="text"
                                                            aria-label={`Save ${project.name}`}
                                                            icon={<CheckOutlined />}
                                                            loading={savingCreditId === project.id}
                                                        />
                                                        <Button
                                                            htmlType="button"
                                                            type="text"
                                                            aria-label={`Remove ${project.name}`}
                                                            icon={<DeleteOutlined />}
                                                            loading={removingCreditId === project.id}
                                                            disabled={savingCreditId === project.id}
                                                            onClick={() => void onRemoveCredit(project)}
                                                        />
                                                    </Flex>
                                                </Form>
                                            </li>
                                        ) : (
                                            <li key={project.id} className="crew-credit">
                                                <div>
                                                    <div className="crew-credit-name">{project.name}</div>
                                                    {detail ? <div className="crew-credit-detail">{detail}</div> : null}
                                                </div>
                                                <div className="crew-credit-side">
                                                    <div className="crew-credit-ref">{project.lead_producer_name}</div>
                                                    {readOnly ? null : (
                                                        <>
                                                            <Button
                                                                htmlType="button"
                                                                type="text"
                                                                aria-label={`Edit ${project.name}`}
                                                                icon={<EditOutlined />}
                                                                onClick={() => setEditingCreditId(project.id)}
                                                            />
                                                            <Button
                                                                htmlType="button"
                                                                type="text"
                                                                aria-label={`Remove ${project.name}`}
                                                                icon={<DeleteOutlined />}
                                                                loading={removingCreditId === project.id}
                                                                onClick={() => void onRemoveCredit(project)}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {readOnly ? null : (
                            <Form
                                form={creditForm}
                                className="review-experience-add"
                                requiredMark={false}
                                onFinish={(values) => void onAddCredit(values)}
                            >
                                <Flex gap={8} align="flex-start" wrap="wrap">
                                    <Form.Item
                                        name="name"
                                        style={{ flex: '1.4 1 180px', marginBottom: 0 }}
                                        rules={[{ required: true, whitespace: true, message: 'Enter a project title.' }]}
                                    >
                                        <Input placeholder="Project title" aria-label="Project title" maxLength={255} />
                                    </Form.Item>
                                    <Form.Item
                                        name="position_id"
                                        style={{ flex: '1 1 160px', marginBottom: 0 }}
                                        rules={[{ required: true, message: 'Choose a position.' }]}
                                    >
                                        <Select
                                            showSearch
                                            popupMatchSelectWidth={false}
                                            aria-label="Position"
                                            placeholder="Position"
                                            optionFilterProp="label"
                                            options={positionOptions}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name="lead_producer_name"
                                        style={{ flex: '1 1 160px', marginBottom: 0 }}
                                        rules={[{ required: true, whitespace: true, message: 'Enter the lead producer.' }]}
                                    >
                                        <Input placeholder="Lead producer" aria-label="Lead producer" />
                                    </Form.Item>
                                    <Button htmlType="submit" className="experience-add" icon={<PlusOutlined />} loading={addingCredit}>
                                        Add credit
                                    </Button>
                                </Flex>
                            </Form>
                            )}

                            <Typography.Text className="review-types-label">Project types</Typography.Text>
                            <div role="group" aria-label="Project types">
                                {groups.map((group) => (
                                    <Flex key={group.id} gap={8} wrap="wrap" style={{ marginTop: 8 }}>
                                        {group.types.map((projectType) => {
                                            const selected = selectedTypeIds.includes(projectType.id);
                                            const chipClass = [
                                                'project-type-chip',
                                                group.also ? 'is-post' : '',
                                                selected ? 'is-selected' : '',
                                                readOnly ? 'is-static' : '',
                                            ].filter(Boolean).join(' ');
                                            return readOnly ? (
                                                <span key={projectType.id} className={chipClass}>
                                                    {projectType.name}
                                                </span>
                                            ) : (
                                                <button
                                                    key={projectType.id}
                                                    type="button"
                                                    className={chipClass}
                                                    aria-pressed={selected}
                                                    onClick={() => toggleType(projectType.id)}
                                                >
                                                    {projectType.name}
                                                </button>
                                            );
                                        })}
                                    </Flex>
                                ))}
                            </div>
                        </section>

                        {readOnly || canSubmit ? null : (
                            <p className="review-minimum">Add at least 2 videos before you submit.</p>
                        )}
                        {readOnly ? null : (
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
                        )}
                    </div>

                    <Modal
                        title="Add a YouTube or Vimeo video"
                        open={linkOpen}
                        okText="Add"
                        cancelText="Cancel"
                        confirmLoading={addingMedia}
                        destroyOnHidden
                        width={480}
                        onOk={() => {
                            void onAddLink();
                        }}
                        onCancel={() => {
                            if (!addingMedia) {
                                setLinkOpen(false);
                            }
                        }}
                    >
                        <Input
                            autoFocus
                            className="media-link"
                            prefix={<LinkOutlined />}
                            placeholder="Paste a Vimeo or YouTube link..."
                            aria-label="Vimeo or YouTube link"
                            value={link}
                            status={linkError ? 'error' : undefined}
                            onChange={(event) => {
                                setLink(event.target.value);
                                if (linkError) {
                                    setLinkError(null);
                                }
                            }}
                            onPressEnter={() => {
                                void onAddLink();
                            }}
                        />
                        {linkError ? (
                            <Typography.Text type="danger" role="alert" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
                                {linkError}
                            </Typography.Text>
                        ) : null}
                        <button type="button" className="media-thumb-pick" onClick={() => thumbRef.current?.click()}>
                            {thumbPreview ? (
                                <img src={thumbPreview} alt="Selected thumbnail" />
                            ) : (
                                <span><PictureOutlined /> Choose a thumbnail</span>
                            )}
                        </button>
                        <input
                            ref={thumbRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            hidden
                            aria-label="Thumbnail"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (file) {
                                    void chooseThumbnail(file);
                                }
                            }}
                        />
                        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                            JPG or PNG · up to 8 MB. This image is shown on the video.
                        </Typography.Text>
                        {thumbError ? (
                            <Typography.Text type="danger" role="alert" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
                                {thumbError}
                            </Typography.Text>
                        ) : null}
                    </Modal>
                    <Modal
                        title="Upload a video"
                        open={uploadOpen}
                        okText="Upload"
                        cancelText="Cancel"
                        confirmLoading={uploading}
                        okButtonProps={{ disabled: !videoFile || !thumbFile }}
                        destroyOnHidden
                        width={440}
                        onOk={() => {
                            void onUpload();
                        }}
                        onCancel={closeUpload}
                    >
                        <button type="button" className="media-upload-note" onClick={() => videoRef.current?.click()} disabled={uploading}>
                            {videoFile ? videoFile.name : 'Choose an MP4, MOV, or WebM'}
                        </button>
                        <input
                            ref={videoRef}
                            type="file"
                            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                            hidden
                            aria-label="Video file"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (file) {
                                    chooseVideo(file);
                                }
                            }}
                        />
                        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                            MP4, MOV, or WebM · up to 200 MB.
                        </Typography.Text>
                        {videoError ? (
                            <Typography.Text type="danger" role="alert" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
                                {videoError}
                            </Typography.Text>
                        ) : null}
                        <button type="button" className="media-thumb-pick" onClick={() => uploadThumbRef.current?.click()} disabled={uploading}>
                            {thumbPreview ? (
                                <img src={thumbPreview} alt="Selected thumbnail" />
                            ) : (
                                <span><PictureOutlined /> Choose a thumbnail</span>
                            )}
                        </button>
                        <input
                            ref={uploadThumbRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            hidden
                            aria-label="Upload thumbnail"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (file) {
                                    void chooseThumbnail(file);
                                }
                            }}
                        />
                        {uploading ? (
                            <Progress
                                percent={uploadPercent}
                                strokeColor={copyThat.pink}
                                style={{ marginTop: 16 }}
                                aria-label="Upload progress"
                            />
                        ) : null}
                    </Modal>
                    <Modal
                        title="Edit video link"
                        open={editingMediaId !== null}
                        okText="Save"
                        cancelText="Cancel"
                        confirmLoading={savingMediaId !== null}
                        destroyOnHidden
                        width={440}
                        onOk={() => {
                            if (editingMediaId) {
                                void onSaveMedia(editingMediaId);
                            }
                        }}
                        onCancel={() => {
                            if (!savingMediaId) {
                                setEditingMediaId(null);
                            }
                        }}
                    >
                        <Input
                            autoFocus
                            className="media-link"
                            prefix={<LinkOutlined />}
                            placeholder="Paste a Vimeo or YouTube link..."
                            aria-label="Replacement link"
                            value={editUrl}
                            status={editError ? 'error' : undefined}
                            onChange={(event) => {
                                setEditUrl(event.target.value);
                                if (editError) {
                                    setEditError(null);
                                }
                            }}
                        />
                        {editError ? (
                            <Typography.Text type="danger" role="alert" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
                                {editError}
                            </Typography.Text>
                        ) : null}
                    </Modal>
                </div>
            )}

            <Typography.Paragraph className="review-footnote">
                Review takes ~24h — you'll show as “Pending review” until approved.
            </Typography.Paragraph>
        </OnboardingFrame>
    );
}

function ProfileEditor({
    data,
    user,
    photoUrl,
    saving,
    onCancel,
    onSave,
}: {
    data: ReviewData;
    user: { first_name: string; last_name: string; email: string; phone: string | null; bio: string | null };
    photoUrl: string | null;
    saving: boolean;
    onCancel: () => void;
    onSave: (values: ProfileEditValues, photoFile: File | null) => void;
}) {
    const { message } = AntdApp.useApp();
    const [form] = Form.useForm<ProfileEditValues>();
    const fileRef = useRef<HTMLInputElement>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const currencyId = Form.useWatch('currency_id', form);
    const disciplineId = Form.useWatch('discipline_id', form);
    const currencyCode = data.currencies.find((currency) => currency.id === currencyId)?.code;
    const ratePrefix = currencyCode ? (currencySymbols[currencyCode] ?? currencyCode) : undefined;

    useEffect(() => {
        if (!photoFile) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(photoFile);
        setPreview(url);
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [photoFile]);

    useEffect(() => {
        if (!disciplineId) {
            return;
        }
        const positionId = form.getFieldValue('position_id');
        const matches = data.positions.some(
            (position) => position.id === positionId && position.discipline_id === disciplineId,
        );
        if (positionId && !matches) {
            form.setFieldValue('position_id', undefined);
        }
    }, [data.positions, disciplineId, form]);

    async function choosePhoto(file: File): Promise<void> {
        if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
            message.error('Use a JPG or PNG photo.');
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            message.error('Use a photo smaller than 8 MB.');
            return;
        }
        try {
            const bitmap = await createImageBitmap(file);
            const tooSmall = bitmap.width < 400 || bitmap.height < 400;
            bitmap.close();
            if (tooSmall) {
                message.error('Use a photo at least 400×400px.');
                return;
            }
        } catch {
            message.error('Could not read that photo.');
            return;
        }
        setPhotoFile(file);
    }

    const photoSrc = preview ?? photoUrl;

    return (
        <div className="review-editor">
            <button type="button" className="basic-photo-pick" onClick={() => fileRef.current?.click()}>
                <span className="basic-photo-ring">
                    {photoSrc ? <img src={photoSrc} alt="Profile photo" /> : <CameraOutlined />}
                </span>
                <span>
                    <Typography.Text strong style={{ display: 'block', fontSize: 14 }}>
                        Change profile photo
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        JPG or PNG · at least 400×400px
                    </Typography.Text>
                </span>
            </button>
            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                hidden
                aria-label="Profile photo file"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) {
                        void choosePhoto(file);
                    }
                }}
            />
            <Form
                form={form}
                className="profile-form"
                layout="vertical"
                requiredMark={false}
                style={{ marginTop: 16 }}
                initialValues={{
                    phone: user.phone ?? '',
                    bio: user.bio ?? '',
                    discipline_id: data.disciplineId,
                    position_id: data.positionId,
                    day_rate: data.dayRate ?? undefined,
                    currency_id: data.currencyId ?? undefined,
                    union_status: data.unionStatus,
                    flat_fee: data.flatFee,
                    locales: data.locales,
                }}
                onFinish={(values) => onSave(values, photoFile)}
            >
                <Flex gap={12} wrap="wrap">
                    <Form.Item label="First name" style={{ flex: '1 1 160px' }}>
                        <Input readOnly className="profile-readonly" value={user.first_name} />
                    </Form.Item>
                    <Form.Item label="Last name" style={{ flex: '1 1 160px' }}>
                        <Input readOnly className="profile-readonly" value={user.last_name} />
                    </Form.Item>
                </Flex>
                <Form.Item label="Work email">
                    <Input readOnly className="profile-readonly" prefix={<MailOutlined />} value={user.email} />
                </Form.Item>
                <Form.Item
                    label="Phone"
                    name="phone"
                    rules={[{ validator: validatePhone }]}
                >
                    <Input inputMode="tel" autoComplete="tel" prefix={<PhoneOutlined />} placeholder="+52 55 0000 0000" />
                </Form.Item>
                <Form.Item
                    label="Bio"
                    name="bio"
                    rules={[
                        { required: true, whitespace: true, message: 'Tell us a bit about you.' },
                        { max: bioLimit, message: 'Bio must be 300 characters or fewer.' },
                    ]}
                >
                    <Input.TextArea
                        className="basic-bio"
                        rows={4}
                        maxLength={bioLimit}
                        showCount
                    />
                </Form.Item>
                <Form.Item
                    label="Discipline"
                    name="discipline_id"
                    rules={[{ required: true, message: 'Choose a discipline.' }]}
                >
                    <Radio.Group className="profile-choice">
                        {data.disciplines.map((discipline) => (
                            <Radio.Button key={discipline.id} value={discipline.id}>
                                <span className="profile-choice-label">
                                    {disciplineIcon(discipline.name)}
                                    {discipline.name}
                                </span>
                            </Radio.Button>
                        ))}
                    </Radio.Group>
                </Form.Item>
                <Form.Item
                    label="Position"
                    name="position_id"
                    rules={[{ required: true, message: 'Choose a position.' }]}
                >
                    <Select
                        showSearch
                        disabled={!disciplineId}
                        placeholder={disciplineId ? 'Select a position' : 'Choose a discipline first'}
                        optionFilterProp="label"
                        options={data.positions
                            .filter((position) => position.discipline_id === disciplineId)
                            .map((position) => ({ value: position.id, label: position.name }))}
                    />
                </Form.Item>
                <Flex gap={12} align="flex-start" wrap="wrap">
                    <Form.Item
                        label="Day rate"
                        name="day_rate"
                        style={{ flex: '1.4 1 180px' }}
                        rules={[{ validator: validateRate }]}
                    >
                        <InputNumber<string>
                            stringMode
                            min="0"
                            precision={2}
                            controls={false}
                            prefix={ratePrefix}
                            style={{ width: '100%' }}
                            formatter={(value) => formatRateInput(value)}
                            parser={(value) => (value ?? '').replace(/,/g, '')}
                            placeholder="0.00"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Currency"
                        name="currency_id"
                        style={{ flex: '1 1 140px' }}
                        rules={[{ required: true, message: 'Choose a currency.' }]}
                    >
                        <Select
                            placeholder="Currency"
                            options={data.currencies.map((row) => ({
                                value: row.id,
                                label: row.code,
                            }))}
                        />
                    </Form.Item>
                </Flex>
                <Form.Item
                    label="Union status"
                    name="union_status"
                    rules={[{ required: true, message: 'Choose a union status.' }]}
                >
                    <Radio.Group className="union-choice">
                        {unionOptions.map((option) => (
                            <Radio.Button key={option.value} value={option.value}>
                                {option.label}
                            </Radio.Button>
                        ))}
                    </Radio.Group>
                </Form.Item>
                <div className="flat-fee-card">
                    <Flex align="center" justify="space-between" gap={16}>
                        <Flex vertical>
                            <Typography.Text strong>Would consider flat fee offers</Typography.Text>
                            <Typography.Text type="secondary">
                                Clients can offer one project price instead of your day rate.
                            </Typography.Text>
                        </Flex>
                        <Form.Item name="flat_fee" valuePropName="checked" noStyle>
                            <Switch className="flat-fee-switch" aria-label="Would consider flat fee offers" />
                        </Form.Item>
                    </Flex>
                </div>
                <Form.Item
                    label="Working as a local in"
                    name="locales"
                    style={{ marginTop: 8 }}
                    rules={[{ validator: validateLocales }]}
                >
                    <LocaleField cities={data.cities} />
                </Form.Item>
                <div className="review-editor-actions">
                    <Button htmlType="button" disabled={saving} onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" loading={saving}>
                        Save profile
                    </Button>
                </div>
            </Form>
        </div>
    );
}

function MediaEmbed({
    src,
    id,
    accessToken,
    label,
}: {
    src: string;
    id: string;
    accessToken: string;
    label: string;
}) {
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        setPlaying(false);
    }, [src]);

    if (!playing) {
        return (
            <button type="button" className="crew-tile-open" aria-label={`Play ${label}`} onClick={() => setPlaying(true)}>
                <MediaThumb id={id} accessToken={accessToken} />
                <span className="crew-play" aria-hidden="true">
                    <CaretRightFilled />
                </span>
            </button>
        );
    }

    return (
        <iframe
            className="crew-tile-frame"
            src={withAutoplay(src)}
            title={label}
            allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
        />
    );
}

function MediaThumb({ id, accessToken }: { id: string; accessToken: string }) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        let url: string | null = null;
        setSrc(null);
        void getMediaThumbnail(accessToken, id).then((blob) => {
            if (!active) {
                return;
            }
            url = URL.createObjectURL(blob);
            setSrc(url);
        }).catch(() => {
            if (active) {
                setSrc(null);
            }
        });

        return () => {
            active = false;
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [accessToken, id]);

    if (!src) {
        return <span className="crew-tile-fallback">Video</span>;
    }

    return <img src={src} alt="" />;
}

function withAutoplay(src: string): string {
    const url = new URL(src);
    url.searchParams.set('autoplay', '1');
    return url.toString();
}

function embedSrc(item: UserMedia): string | null {
    if (item.media_type === 'upload') {
        return null;
    }
    const link = classifyMediaLink(item.ref);
    if (!link) {
        return null;
    }
    if (link.media_type === 'youtube') {
        return `https://www.youtube.com/embed/${link.videoId}`;
    }
    return `https://player.vimeo.com/video/${link.videoId}`;
}

function openMedia(item: UserMedia, message: ReturnType<typeof AntdApp.useApp>['message']): void {
    const url = mediaUrl(item);
    if (!url) {
        message.info("Playback for uploaded videos isn't available here yet.");
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

function persistTypes(
    saveQueue: { current: Promise<void> },
    projectsRef: { current: Project[] },
    selectedTypeIdsRef: { current: string[] },
    accessToken: string,
): Promise<void> {
    const run = saveQueue.current.then(async () => {
        const typeIds = selectedTypeIdsRef.current;
        await Promise.all(projectsRef.current.map((project) => updateProjectProjectTypes(accessToken, project.id, typeIds)));
    });
    saveQueue.current = run.then(() => undefined, () => undefined);
    return run;
}

function creditDetail(
    project: Project,
    positionById: Map<string, string>,
    typeIds: string[],
    typeName: Map<string, string>,
): string {
    const position = positionById.get(project.position_id) ?? null;
    const types = typeIds.flatMap((id) => {
        const name = typeName.get(id);
        return name ? [name] : [];
    });
    return [position, types.length > 0 ? types.join(', ') : null].filter((part): part is string => Boolean(part)).join(' · ');
}

function positionSelectOptions(disciplines: Discipline[], positions: Position[]): Array<{
    label: string;
    options: Array<{ value: string; label: string }>;
}> {
    return disciplines.map((discipline) => ({
        label: discipline.name,
        options: positions
            .filter((position) => position.discipline_id === discipline.id)
            .map((position) => ({ value: position.id, label: position.name })),
    }));
}

function typeGroups(disciplines: Discipline[], projectTypes: ProjectType[]): Array<{
    id: string;
    name: string;
    also: boolean;
    types: ProjectType[];
}> {
    return disciplines.flatMap((discipline, index) => {
        const types = orderNamed(
            projectTypes.filter((projectType) => projectType.discipline_id === discipline.id),
            typeOrder[discipline.name] ?? [],
        );
        if (types.length === 0) {
            return [];
        }
        return [{ id: discipline.id, name: discipline.name, also: index > 0, types }];
    });
}

function orderNamed<T extends { name: string }>(rows: T[], preferred: string[]): T[] {
    return [...rows].sort((left, right) => {
        const leftRank = rank(preferred, left.name);
        const rightRank = rank(preferred, right.name);
        if (leftRank !== rightRank) {
            return leftRank - rightRank;
        }
        return left.name.localeCompare(right.name);
    });
}

function rank(order: string[], name: string): number {
    const index = order.indexOf(name);
    return index === -1 ? order.length : index;
}

function disciplineIcon(name: string): ReactNode {
    if (name === 'Shooting') {
        return <VideoCameraOutlined />;
    }
    return <PlaySquareOutlined />;
}

function workedOn(names: string[]): string | null {
    const only = names[0];
    if (!only) {
        return null;
    }
    if (names.length === 1) {
        return `Worked on ${only}.`;
    }
    const shown = names.slice(0, 3);
    const last = shown[shown.length - 1];
    const lead = shown.slice(0, -1).join(', ');
    if (!last) {
        return `Worked on ${only}.`;
    }
    if (names.length > 3) {
        return `Worked on ${lead}, ${last} and more.`;
    }
    return `Worked on ${lead} and ${last}.`;
}

function cityLine(locales: SetupCity[], cities: ProductionCity[]): string | null {
    const home = locales.find((locale) => locale.home_city) ?? locales[0];
    if (!home) {
        return null;
    }
    const nameOf = (id: string) => cities.find((city) => city.id === id)?.name;
    const homeName = nameOf(home.production_city_id);
    if (!homeName) {
        return null;
    }
    const others = locales
        .filter((locale) => locale !== home)
        .flatMap((locale) => {
            const name = nameOf(locale.production_city_id);
            return name ? [name] : [];
        });
    return [`Local in ${homeName}`, ...others].join(' · ');
}

function formatPerDay(amount: number | null, currency: Currency | undefined): string | null {
    if (amount === null) {
        return null;
    }
    const digits = Number.isInteger(amount) ? 0 : 2;
    const formatted = amount.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
    const symbol = currency ? currencySymbols[currency.code] : undefined;
    const money = symbol ? `${symbol}${formatted}` : currency ? `${formatted} ${currency.code}` : formatted;
    return `${money} per day`;
}

function formatRateInput(value: string | number | undefined | null): string {
    if (value === undefined || value === null || value === '') {
        return '';
    }
    const [whole, fraction] = String(value).split('.');
    const withCommas = (whole ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fraction !== undefined ? `${withCommas}.${fraction}` : withCommas;
}

function readRate(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value.replace(/,/g, ''));
        if (Number.isFinite(parsed) && parsed >= 0) {
            return parsed;
        }
    }
    return null;
}

function validateRate(_: unknown, value: unknown): Promise<void> {
    if (readRate(value) === null) {
        return Promise.reject(new Error('Enter a day rate.'));
    }
    return Promise.resolve();
}

function validatePhone(_: unknown, value: unknown): Promise<void> {
    if (typeof value === 'string' && isPhone(value.trim())) {
        return Promise.resolve();
    }
    return Promise.reject(new Error('Enter a phone number with at least 7 digits.'));
}

function isPhone(phone: string): boolean {
    return /^[0-9+().\-\s]+$/.test(phone) && (phone.match(/\d/g)?.length ?? 0) >= 7;
}

function validateLocales(_: unknown, value: unknown): Promise<void> {
    if (!Array.isArray(value) || value.length === 0) {
        return Promise.reject(new Error('Add at least one city.'));
    }
    const homes = value.filter((row) => isSetupCity(row) && row.home_city);
    if (homes.length !== 1) {
        return Promise.reject(new Error('Choose one home city.'));
    }
    const ids = value.map((row) => (isSetupCity(row) ? row.production_city_id : ''));
    if (new Set(ids).size !== value.length) {
        return Promise.reject(new Error('Each city can only be added once.'));
    }
    return Promise.resolve();
}

function isSetupCity(value: unknown): value is SetupCity {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const row = value as Record<string, unknown>;
    return typeof row.production_city_id === 'string' && typeof row.home_city === 'boolean';
}

function initials(first: string, last: string): string {
    return `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase() || '?';
}

function mediaLabel(item: UserMedia, index: number, total: number): string {
    const source = item.media_type === 'youtube' ? 'YouTube' : item.media_type === 'vimeo' ? 'Vimeo' : 'Uploaded';
    const place = index === 0 ? 'cover' : `${index + 1} of ${total}`;
    return `${source} video, ${place}`;
}

function videoContentType(file: File): string | null {
    const type = file.type.toLowerCase();
    if (type === 'video/mp4' || type === 'video/quicktime' || type === 'video/webm') {
        return type;
    }
    if (type && type !== 'application/octet-stream') {
        return null;
    }
    const name = file.name.toLowerCase();
    if (name.endsWith('.mp4')) {
        return 'video/mp4';
    }
    if (name.endsWith('.mov')) {
        return 'video/quicktime';
    }
    if (name.endsWith('.webm')) {
        return 'video/webm';
    }
    return null;
}

function isAbort(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}

import {
    ArrowRightOutlined,
    CaretRightFilled,
    PictureFilled,
    VideoCameraFilled,
    EllipsisOutlined,
    EnvironmentOutlined,
    HeartOutlined,
    InfoCircleOutlined,
    MinusOutlined,
    PlusOutlined,
    ShareAltOutlined,
} from '@ant-design/icons';
import { mediaUrl, type Currency, type Project, type UserMedia } from '@sugarcube/schema';
import { App as AntdApp, Button, DatePicker, Dropdown, Result, Spin, Switch, Tooltip } from 'antd';
import { PhotoLightbox } from './PhotoLightbox.tsx';
import type { MenuProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { listCurrencies, listPositions, listProductionCities } from '../../api/catalog.ts';
import { ApiError } from '../../api/http.ts';
import { getMediaThumbnail, listMedia } from '../../api/media.ts';
import {
    getMe,
    getProfilePhotoUrl,
    getWorkProfile,
    listLocales,
    listWorkProfiles,
    type CurrentUser,
    type UnionStatus,
} from '../../api/me.ts';
import { listProjects } from '../../api/projects.ts';
import { Frame } from '../../components/Frame.tsx';
import { ProjectCredit, projectFacts } from '../../components/ProjectCredit.tsx';
import { useAppSelector, useSession } from '../../store/hooks.ts';

export const profilePath = '/profile';

const bookingFeeRate = 0.08;

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

type Credit = {
    id: string;
    name: string;
    date: string;
    position: string | null;
    company: string | null;
    leadProducer: string;
    leadProducerEmail: string | null;
};

type DateWindow = {
    start: string | null;
    end: string | null;
};

type ProfilePaths = {
    media: string;
    projects: string;
    locales: string;
    workProfile: string;
    workProfiles: string;
    photo: string;
    thumbnail: (id: string) => string;
};

const ownPaths: ProfilePaths = {
    media: '/api/me/media',
    projects: '/api/me/projects',
    locales: '/api/me/locales',
    workProfile: '/api/me/work-profile',
    workProfiles: '/api/me/work-profiles',
    photo: '/api/me/photo/url',
    thumbnail: (id) => `/api/me/media/${encodeURIComponent(id)}/thumbnail`,
};

type ProfileSnapshot = {
    media: UserMedia[];
    credits: Credit[];
    positionNames: string[];
    unionLabel: string | null;
    dayRate: number | null;
    currency: Currency | undefined;
    flatFee: boolean;
    projectsCompleted: number | null;
    yearsInBusiness: number | null;
    responseTimeHours: number | null;
    homeCity: string | null;
    otherCities: string[];
};

export type ProfilePageProps = {
    userId?: string;
    accessToken?: string;
    embedded?: boolean;
    titleSuffix?: string;
};

export function ProfilePage({
    userId,
    accessToken,
    embedded = false,
    titleSuffix = 'CopyThat',
}: ProfilePageProps = {}) {
    if (userId) {
        return (
            <ProfileForUser
                userId={userId}
                accessToken={accessToken ?? null}
                embedded={embedded}
                titleSuffix={titleSuffix}
            />
        );
    }
    return <OwnProfilePage />;
}

function OwnProfilePage() {
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    return (
        <ProfileScreen
            accessToken={session?.accessToken ?? null}
            user={user}
            paths={ownPaths}
            framed
            titleSuffix="CopyThat"
        />
    );
}

function ProfileForUser({
    userId,
    accessToken,
    embedded,
    titleSuffix,
}: {
    userId: string;
    accessToken: string | null;
    embedded: boolean;
    titleSuffix: string;
}) {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const paths = useMemo(() => profilePaths(userId), [userId]);

    useEffect(() => {
        if (!accessToken) {
            return;
        }

        let active = true;
        setUser(null);
        setError(null);
        void getMe(accessToken, `/api/admin/users/${encodeURIComponent(userId)}`)
            .then((row) => {
                if (active) {
                    setUser(row);
                }
            })
            .catch((cause: unknown) => {
                if (active) {
                    setError(cause instanceof Error ? cause.message : 'Could not load this profile.');
                }
            });

        return () => {
            active = false;
        };
    }, [accessToken, attempt, userId]);

    if (!accessToken) {
        return null;
    }
    if (error) {
        return (
            <Result
                status="error"
                title="Could not load this profile"
                subTitle={error}
                extra={(
                    <Button type="primary" onClick={() => setAttempt((value) => value + 1)}>
                        Try again
                    </Button>
                )}
            />
        );
    }

    return (
        <ProfileScreen
            accessToken={accessToken}
            user={user}
            paths={paths}
            framed={!embedded}
            titleSuffix={titleSuffix}
        />
    );
}

function profilePaths(userId: string): ProfilePaths {
    const root = `/api/admin/users/${encodeURIComponent(userId)}`;
    return {
        media: `${root}/media`,
        projects: `${root}/projects`,
        locales: `${root}/locales`,
        workProfile: `${root}/work-profile`,
        workProfiles: `${root}/work-profiles`,
        photo: `${root}/photo/url`,
        thumbnail: (id) => `${root}/media/${encodeURIComponent(id)}/thumbnail`,
    };
}

function ProfileScreen({
    accessToken,
    user,
    paths,
    framed,
    titleSuffix,
}: {
    accessToken: string | null;
    user: CurrentUser | null;
    paths: ProfilePaths;
    framed: boolean;
    titleSuffix: string;
}) {
    const { message } = AntdApp.useApp();
    const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [showAllMedia, setShowAllMedia] = useState(false);
    const [enlargedPhotoId, setEnlargedPhotoId] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const name = user ? publicName(user.first_name, user.last_name) : 'Profile';
        document.title = `${name} — ${titleSuffix}`;
    }, [titleSuffix, user]);

    useEffect(() => {
        if (!accessToken) {
            return;
        }

        const token = accessToken;
        let active = true;
        setSnapshot(null);
        setLoadError(null);

        void (async () => {
            try {
                const [media, projects, positions, currencies, cities, locales, rates, workProfiles] = await Promise.all([
                    listMedia(token, paths.media),
                    listProjects(token, paths.projects),
                    listPositions(token),
                    listCurrencies(token),
                    listProductionCities(token),
                    listLocales(token, paths.locales),
                    loadRates(token, paths.workProfile),
                    listWorkProfiles(token, paths.workProfiles),
                ]);
                if (!active) {
                    return;
                }
                const currency = currencies.find((row) => row.id === rates?.currency_id);
                const home = locales.find((locale) => locale.home_city) ?? null;
                const ordered = [
                    ...(home ? [home] : []),
                    ...locales.filter((locale) => locale !== home),
                ];
                const named = ordered.flatMap((locale) => {
                    const name = cities.find((city) => city.id === locale.production_city_id)?.name;
                    return name ? [name] : [];
                });
                const positionNames = workProfiles.flatMap((row) => {
                    const name = positions.find((position) => position.id === row.position_id)?.name;
                    return name ? [name] : [];
                });
                setSnapshot({
                    media,
                    credits: projects.map((project) => toCredit(project, positions)),
                    positionNames,
                    unionLabel: rates ? unionLabels[rates.union_status] : null,
                    dayRate: rates?.day_rate ?? null,
                    currency,
                    flatFee: rates?.flat_fee ?? false,
                    projectsCompleted: rates?.projects_completed ?? null,
                    yearsInBusiness: rates?.years_in_business ?? null,
                    responseTimeHours: rates?.response_time_hours ?? null,
                    homeCity: named[0] ?? null,
                    otherCities: named.slice(1),
                });
            } catch (error: unknown) {
                if (active) {
                    setLoadError(error instanceof Error ? error.message : 'Could not load this profile.');
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [accessToken, attempt, paths]);

    useEffect(() => {
        if (!accessToken || !user?.photo) {
            setPhotoUrl(null);
            return;
        }

        const token = accessToken;
        let active = true;
        setPhotoUrl(null);
        void getProfilePhotoUrl(token, paths.photo).then((link) => {
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
    }, [accessToken, paths.photo, user?.photo]);

    async function onShare(): Promise<void> {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: document.title, url });
                return;
            }
        } catch (error: unknown) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            message.success('Profile link copied.');
        } catch {
            message.error('Could not copy the profile link.');
        }
    }

    function onAdd(): void {
        message.info("Project requests aren't open yet.");
    }

    function onMessage(): void {
        message.info("Messaging isn't available yet.");
    }

    if (!accessToken) {
        return null;
    }

    const name = user ? publicName(user.first_name, user.last_name) : 'Profile';
    const positionLabel = snapshot && snapshot.positionNames.length > 0 ? snapshot.positionNames.join(' & ') : null;
    const title = positionLabel || name;
    const subtitle = snapshot ? workedOn(snapshot.credits.map((credit) => credit.name)) : null;
    const rateLabel = snapshot ? formatPerDay(snapshot.dayRate, snapshot.currency) : null;
    const role = [positionLabel, rateLabel].filter((part): part is string => Boolean(part)).join(' · ');
    const where = snapshot ? cityLine(snapshot.homeCity, snapshot.otherCities) : null;
    const visibleMedia = snapshot && !showAllMedia ? snapshot.media.slice(0, 4) : snapshot?.media ?? [];
    const moreMedia = Boolean(snapshot && snapshot.media.length > 4 && !showAllMedia);
    const mosaic = !showAllMedia && visibleMedia.length >= 3;
    const mediaClass = showAllMedia
        ? 'crew-media is-expanded'
        : mosaic
            ? 'crew-media is-mosaic'
            : visibleMedia.length === 1
                ? 'crew-media is-single'
                : 'crew-media is-pair';
    const moreMenu: MenuProps['items'] = [{ key: 'copy', label: 'Copy profile link' }];

    const content = (
        <>
            {loadError ? (
                <Result
                    status="error"
                    title="Could not load this profile"
                    subTitle={loadError}
                    extra={(
                        <Button type="primary" onClick={() => setAttempt((value) => value + 1)}>
                            Try again
                        </Button>
                    )}
                />
            ) : !snapshot || !user ? (
                <Spin size="large" description="Loading profile…" />
            ) : (
                <div className="crew-profile">
                    <div className="crew-main">
                        <div className="crew-intro">
                            <div>
                                <h1>{title}</h1>
                                {subtitle ? <p>{subtitle}</p> : null}
                            </div>
                            <div className="crew-actions">
                                <Dropdown
                                    menu={{ items: moreMenu, onClick: () => void onShare() }}
                                    trigger={['click']}
                                >
                                    <button type="button" className="crew-icon-btn" aria-label="More">
                                        <EllipsisOutlined />
                                    </button>
                                </Dropdown>
                                <Button className="crew-message" onClick={onMessage}>Message</Button>
                                <Button type="primary" className="crew-add" onClick={onAdd}>Add to Project</Button>
                                <button
                                    type="button"
                                    className={saved ? 'crew-icon-btn is-on' : 'crew-icon-btn'}
                                    aria-pressed={saved}
                                    aria-label={saved ? 'Remove saved profile' : 'Save profile'}
                                    onClick={() => setSaved((value) => !value)}
                                >
                                    <HeartOutlined />
                                </button>
                                <button type="button" className="crew-icon-btn" aria-label="Share profile" onClick={() => void onShare()}>
                                    <ShareAltOutlined />
                                </button>
                            </div>
                        </div>

                        {visibleMedia.length > 0 ? (
                            <div className={mediaClass}>
                                {visibleMedia.map((item, index) => (
                                    <MediaTile
                                        key={item.id}
                                        item={item}
                                        accessToken={accessToken}
                                        thumbnailPath={paths.thumbnail(item.id)}
                                        featured={mosaic && index === 0}
                                        play={index === 0 && item.media_type !== 'photo'}
                                        showAll={moreMedia && index === visibleMedia.length - 1}
                                        onOpen={() => {
                                            if (item.media_type === 'photo') {
                                                setEnlargedPhotoId(item.id);
                                                return;
                                            }
                                            openMedia(item, message);
                                        }}
                                        onShowAll={() => setShowAllMedia(true)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="crew-media-empty">No media yet</div>
                        )}
                        <PhotoLightbox
                            accessToken={accessToken}
                            id={enlargedPhotoId}
                            path={enlargedPhotoId ? paths.thumbnail(enlargedPhotoId) : null}
                            onClose={() => setEnlargedPhotoId(null)}
                        />
                        {showAllMedia && snapshot.media.length > 4 ? (
                            <button type="button" className="crew-show-less" onClick={() => setShowAllMedia(false)}>
                                Show less
                            </button>
                        ) : null}

                        <div className="crew-identity">
                            <span className="crew-avatar" aria-hidden="true">
                                {photoUrl ? <img src={photoUrl} alt="" onError={() => setPhotoUrl(null)} /> : initials(user.first_name, user.last_name)}
                            </span>
                            <div>
                                <div className="crew-name-row">
                                    <h2>{name}</h2>
                                    {snapshot.unionLabel ? <span className="crew-union">{snapshot.unionLabel}</span> : null}
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
                                <div className="crew-about-head">
                                    <h2 id="crew-about-title">About</h2>
                                </div>
                                <p>{user.bio}</p>
                            </section>
                        ) : null}

                        <div className="crew-stats">
                            <div className="crew-stat">
                                <strong>{countLabel(snapshot.projectsCompleted)}</strong>
                                <span>Projects completed</span>
                            </div>
                            <div className="crew-stat">
                                <strong>{responseLabel(snapshot.responseTimeHours)}</strong>
                                <span>Average Response</span>
                            </div>
                            <div className="crew-stat">
                                <strong>100%</strong>
                                <span>Repeat Clients</span>
                            </div>
                            <div className="crew-stat">
                                <strong>{countLabel(snapshot.yearsInBusiness)}</strong>
                                <span>Years Active</span>
                            </div>
                        </div>

                        {snapshot.credits.length > 0 ? (
                            <section className="crew-panel" aria-labelledby="crew-experience-title">
                                <div className="crew-panel-head">
                                    <h2 id="crew-experience-title">Past experience</h2>
                                </div>
                                <ul className="credit-list">
                                    {snapshot.credits.map((credit) => (
                                        <ProjectCredit
                                            key={credit.id}
                                            name={credit.name}
                                            handle={false}
                                            facts={projectFacts({
                                                date: credit.date,
                                                position: credit.position,
                                                company: credit.company,
                                                leadProducer: credit.leadProducer,
                                                leadProducerEmail: credit.leadProducerEmail,
                                            })}
                                        />
                                    ))}
                                </ul>
                            </section>
                        ) : null}
                    </div>

                    <BookingCard
                        dayRate={snapshot.dayRate}
                        currency={snapshot.currency}
                        positionName={snapshot.positionNames[0] ?? null}
                        flatFee={snapshot.flatFee}
                        onAdd={onAdd}
                    />
                </div>
            )}
        </>
    );

    return framed ? <Frame>{content}</Frame> : content;
}

function BookingCard({
    dayRate,
    currency,
    positionName,
    flatFee,
    onAdd,
}: {
    dayRate: number | null;
    currency: Currency | undefined;
    positionName: string | null;
    flatFee: boolean;
    onAdd: () => void;
}) {
    const [start, setStart] = useState<string | null>(null);
    const [end, setEnd] = useState<string | null>(null);
    const [days, setDays] = useState(1);
    const [prep, setPrep] = useState<DateWindow | null>(null);
    const [wrap, setWrap] = useState<DateWindow | null>(null);
    const [offerFee, setOfferFee] = useState(false);
    const [details, setDetails] = useState(false);
    const counted = inclusiveDays(start, end);
    const rangeError = start && end && counted === null ? 'Shoot end is before the start.' : null;
    const total = dayRate === null ? null : dayRate * days;
    const fee = total === null ? null : total * bookingFeeRate;
    const dayMenu: MenuProps['items'] = Array.from({ length: 21 }, (_, index) => {
        const count = index + 1;
        return { key: String(count), label: count === 1 ? '1 day' : `${count} days` };
    });

    useEffect(() => {
        if (counted) {
            setDays(counted);
        }
    }, [counted]);

    return (
        <aside className="crew-booking" aria-label="Booking">
            <div className="crew-price">
                <strong>{dayRate === null ? 'Rate on request' : formatAmount(dayRate, currency, 0)}</strong>
                {dayRate !== null ? (
                    <span>{positionName ? `per day · ${positionName}` : 'per day'}</span>
                ) : null}
            </div>

            <div className="crew-shoot">
                <label>
                    <span>Shoot start</span>
                    <DatePicker
                        variant="borderless"
                        format="M/D/YYYY"
                        placeholder="Select"
                        allowClear
                        onChange={(_date, dateString) => setStart(dateText(dateString))}
                    />
                </label>
                <label>
                    <span>Shoot end</span>
                    <DatePicker
                        variant="borderless"
                        format="M/D/YYYY"
                        placeholder="Select"
                        allowClear
                        onChange={(_date, dateString) => setEnd(dateText(dateString))}
                    />
                </label>
            </div>
            {rangeError ? <p className="crew-range-error">{rangeError}</p> : null}

            {prep ? (
                <ExtraDays label="Prep" value={prep} onChange={setPrep} onRemove={() => setPrep(null)} />
            ) : (
                <button type="button" className="crew-extra-add" onClick={() => setPrep({ start: null, end: null })}>
                    <PlusOutlined />
                    Add prep days
                </button>
            )}
            {wrap ? (
                <ExtraDays label="Wrap" value={wrap} onChange={setWrap} onRemove={() => setWrap(null)} />
            ) : (
                <button type="button" className="crew-extra-add" onClick={() => setWrap({ start: null, end: null })}>
                    <PlusOutlined />
                    Add wrap days
                </button>
            )}
            <p className="crew-book-note">Book only what you need — prep and wrap are optional.</p>

            <p className="crew-section-label">Cancellation policies</p>
            {dayRate !== null && total !== null ? (
                <Dropdown
                    menu={{
                        items: dayMenu,
                        onClick: ({ key }) => setDays(Number(key)),
                        selectedKeys: [String(days)],
                    }}
                    trigger={['click']}
                >
                    <button type="button" className="crew-quote" aria-label="Booked days">
                        <span>
                            <strong>{days === 1 ? 'Day rate × 1 day' : `Day rate × ${days} days`}</strong>
                            <span>{formatAmount(total, currency, 2)} total</span>
                        </span>
                        <Tooltip title="The total is the day rate times booked days. Shoot dates fill this in. The 8% booking fee is separate and is not charged yet.">
                            <span className="crew-quote-info" onClick={(event) => event.stopPropagation()}>
                                <InfoCircleOutlined />
                            </span>
                        </Tooltip>
                    </button>
                </Dropdown>
            ) : null}

            {flatFee ? (
                <div className="crew-offer">
                    <div>
                        <strong>Offer a project fee</strong>
                        <p>Clients can offer one project price instead of the day rate.</p>
                    </div>
                    <Switch
                        className="flat-fee-switch"
                        checked={offerFee}
                        onChange={setOfferFee}
                        aria-label="Offer a project fee"
                    />
                </div>
            ) : null}

            <Button type="primary" className="crew-book" onClick={onAdd}>Add to Project</Button>
            <p className="crew-charge">You won't be charged yet</p>

            {fee !== null && total !== null ? (
                <>
                    <div className="crew-fee">
                        <span>8% total booking fee</span>
                        <strong>{formatAmount(fee, currency, 2)}</strong>
                    </div>
                    <button
                        type="button"
                        className="crew-budget"
                        aria-expanded={details}
                        onClick={() => setDetails((value) => !value)}
                    >
                        Go to details on budget
                        <ArrowRightOutlined />
                    </button>
                    {details ? (
                        <dl className="crew-breakdown">
                            <div>
                                <dt>{days === 1 ? 'Day rate × 1 day' : `Day rate × ${days} days`}</dt>
                                <dd>{formatAmount(total, currency, 2)}</dd>
                            </div>
                            <div>
                                <dt>Booking fee (8%)</dt>
                                <dd>{formatAmount(fee, currency, 2)}</dd>
                            </div>
                            {offerFee ? (
                                <div>
                                    <dt>Project fee</dt>
                                    <dd>Offered</dd>
                                </div>
                            ) : null}
                            <div>
                                <dt>Total with fee</dt>
                                <dd>{formatAmount(total + fee, currency, 2)}</dd>
                            </div>
                        </dl>
                    ) : null}
                </>
            ) : null}
        </aside>
    );
}

function ExtraDays({
    label,
    value,
    onChange,
    onRemove,
}: {
    label: string;
    value: DateWindow;
    onChange: (value: DateWindow) => void;
    onRemove: () => void;
}) {
    return (
        <div className="crew-extra">
            <div>
                <span className="crew-extra-label">{label}</span>
                <div className="crew-extra-dates">
                    <DatePicker
                        variant="borderless"
                        format="M/D/YYYY"
                        placeholder="Start"
                        allowClear
                        onChange={(_date, dateString) => onChange({ ...value, start: dateText(dateString) })}
                    />
                    <span aria-hidden="true">—</span>
                    <DatePicker
                        variant="borderless"
                        format="M/D/YYYY"
                        placeholder="End"
                        allowClear
                        onChange={(_date, dateString) => onChange({ ...value, end: dateText(dateString) })}
                    />
                </div>
            </div>
            <button type="button" className="crew-extra-remove" aria-label={`Remove ${label.toLowerCase()} days`} onClick={onRemove}>
                <MinusOutlined />
            </button>
        </div>
    );
}

function MediaTile({
    item,
    accessToken,
    thumbnailPath,
    featured,
    play,
    showAll,
    onOpen,
    onShowAll,
}: {
    item: UserMedia;
    accessToken: string;
    thumbnailPath: string;
    featured: boolean;
    play: boolean;
    showAll: boolean;
    onOpen: () => void;
    onShowAll: () => void;
}) {
    const photo = item.media_type === 'photo';
    return (
        <div className={featured ? 'crew-tile crew-tile-hero' : 'crew-tile'}>
            <button
                type="button"
                className="crew-tile-open"
                onClick={onOpen}
                aria-label={photo ? 'View photo' : play ? 'Play video' : 'Open video'}
            >
                <MediaThumb id={item.id} accessToken={accessToken} path={thumbnailPath} fallback={photo ? 'Photo' : 'Video'} />
                <span className="media-mark" aria-hidden="true">
                    {photo ? <PictureFilled /> : <VideoCameraFilled />}
                </span>
                {play ? (
                    <span className="crew-play" aria-hidden="true">
                        <CaretRightFilled />
                    </span>
                ) : null}
            </button>
            {showAll ? (
                <button type="button" className="crew-show-all" onClick={onShowAll}>
                    Show all media
                </button>
            ) : null}
        </div>
    );
}

function MediaThumb({
    id,
    accessToken,
    path,
    fallback = 'Video',
}: {
    id: string;
    accessToken: string;
    path: string;
    fallback?: string;
}) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        let url: string | null = null;
        setSrc(null);
        void getMediaThumbnail(accessToken, id, path).then((blob) => {
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
    }, [accessToken, id, path]);

    if (!src) {
        return <span className="crew-tile-fallback">{fallback}</span>;
    }

    return <img src={src} alt="" />;
}

function openMedia(item: UserMedia, message: ReturnType<typeof AntdApp.useApp>['message']): void {
    if (item.media_type === 'photo') {
        return;
    }
    const url = mediaUrl(item);
    if (!url) {
        message.info("Playback for uploaded videos isn't available here yet.");
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

async function loadRates(accessToken: string, path: string) {
    try {
        return await getWorkProfile(accessToken, path);
    } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }
        throw error;
    }
}

function countLabel(value: number | null): string {
    return value === null ? '—' : String(value);
}

function responseLabel(hours: number | null): string {
    return hours === null ? '—' : `< ${hours}h`;
}

function toCredit(project: Project, positions: Array<{ id: string; name: string }>): Credit {
    return {
        id: project.id,
        name: project.name,
        date: project.date,
        position: positions.find((row) => row.id === project.position_id)?.name ?? null,
        company: project.production_company,
        leadProducer: project.lead_producer_name,
        leadProducerEmail: project.lead_producer_email,
    };
}

function publicName(first: string, last: string): string {
    const given = first.trim();
    const initial = last.trim().charAt(0);
    if (given && initial) {
        return `${given} ${initial}`;
    }
    return given || last.trim() || 'Crew';
}

function initials(first: string, last: string): string {
    return `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase() || '?';
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

function cityLine(home: string | null, others: string[]): string | null {
    const parts = [
        ...(home ? [`Local in ${home}`] : []),
        ...others,
    ];
    return parts.length > 0 ? parts.join(' · ') : null;
}

function formatPerDay(amount: number | null, currency: Currency | undefined): string | null {
    if (amount === null) {
        return null;
    }
    const digits = Number.isInteger(amount) ? 0 : 2;
    return `${formatAmount(amount, currency, digits)} per day`;
}

function formatAmount(amount: number, currency: Currency | undefined, digits: number): string {
    const formatted = amount.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
    const code = currency?.code;
    const symbol = code ? currencySymbols[code] : undefined;
    if (symbol) {
        return `${symbol}${formatted}`;
    }
    return code ? `${formatted} ${code}` : formatted;
}

function inclusiveDays(start: string | null, end: string | null): number | null {
    if (!start || !end) {
        return null;
    }
    const from = parseUsDate(start);
    const to = parseUsDate(end);
    if (!from || !to) {
        return null;
    }
    const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    if (diff < 0) {
        return null;
    }
    return diff + 1;
}

function parseUsDate(value: string): Date | null {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    const monthText = match?.[1];
    const dayText = match?.[2];
    const yearText = match?.[3];
    if (!monthText || !dayText || !yearText) {
        return null;
    }
    const month = Number(monthText);
    const day = Number(dayText);
    const year = Number(yearText);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }
    return date;
}

function dateText(value: string | string[] | null | undefined): string | null {
    const text = Array.isArray(value) ? value[0] : value;
    return text ? text : null;
}

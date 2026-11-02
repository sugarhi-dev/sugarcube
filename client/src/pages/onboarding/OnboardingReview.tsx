import { ArrowLeftOutlined, ArrowRightOutlined, CaretRightFilled, EyeOutlined, SendOutlined } from '@ant-design/icons';
import type { Currency, ProductionCity, UserLocale, UserMedia } from '@sugarcube/schema';
import { App as AntdApp, Button, Flex, Result, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { listCurrencies, listPositions, listProductionCities, listProjectTypes } from '../../api/catalog.ts';
import { getMediaThumbnail, listMedia } from '../../api/media.ts';
import {
    getProfilePhotoUrl,
    getWorkProfile,
    listLocales,
    listWorkProfiles,
    submitProfile,
    type UnionStatus,
} from '../../api/me.ts';
import { listProjectProjectTypes, listProjects } from '../../api/projects.ts';
import { useAppDispatch, useAppSelector, useSession } from '../../store/hooks.ts';
import { profileLoaded } from '../../store/profileSlice.ts';
import { copyThat } from '../../theme.ts';
import { profilePath } from '../profile/ProfilePage.tsx';
import { OnboardingFrame } from './OnboardingFrame.tsx';
import { onboardingMediaPath } from './OnboardingMedia.tsx';
import { onboardingWaitPath } from './OnboardingWait.tsx';

export const onboardingReviewPath = '/onboarding/review';

const minimumMedia = 2;

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

type ReviewSnapshot = {
    media: UserMedia[];
    positionName: string | null;
    unionLabel: string;
    rateLabel: string | null;
    cityLabel: string | null;
    typeNames: string[];
    creditCount: number;
};

export function OnboardingReview() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    const { message } = AntdApp.useApp();
    const [snapshot, setSnapshot] = useState<ReviewSnapshot | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

    useEffect(() => {
        document.title = 'Review & go live';
    }, []);

    useEffect(() => {
        if (!session) {
            return;
        }

        const token = session.accessToken;
        let active = true;
        setSnapshot(null);
        setLoadError(null);

        void (async () => {
            try {
                const [media, projects, projectTypes, positions, currencies, cities, locales, rates, workProfiles] = await Promise.all([
                    listMedia(token),
                    listProjects(token),
                    listProjectTypes(token),
                    listPositions(token),
                    listCurrencies(token),
                    listProductionCities(token),
                    listLocales(token),
                    getWorkProfile(token),
                    listWorkProfiles(token),
                ]);
                const links = await Promise.all(projects.map((project) => listProjectProjectTypes(token, project.id)));
                if (!active) {
                    return;
                }
                const selected = new Set(links.flat().map((link) => link.project_type_id));
                const positionId = workProfiles[0]?.position_id;
                const currency = currencies.find((row) => row.id === rates.currency_id);
                setSnapshot({
                    media,
                    positionName: positionId ? positions.find((row) => row.id === positionId)?.name ?? null : null,
                    unionLabel: unionLabels[rates.union_status],
                    rateLabel: formatRate(rates.day_rate, currency),
                    cityLabel: formatCity(locales, cities),
                    typeNames: projectTypes.filter((row) => selected.has(row.id)).map((row) => row.name),
                    creditCount: projects.length,
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

    async function onSubmit(): Promise<void> {
        if (!session || submitting) {
            return;
        }

        setSubmitting(true);
        try {
            const updated = await submitProfile(session.accessToken);
            dispatch(profileLoaded({ user: updated, forSubject: session.profile.subject }));
            navigate(onboardingWaitPath, { replace: true });
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not submit your profile.');
        } finally {
            setSubmitting(false);
        }
    }

    const accountLabel = user?.account_type === 'client' ? 'CLIENT SETUP' : 'CREW SETUP';
    const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
    const headline = snapshot?.positionName ? `${displayName} — ${snapshot.positionName}` : displayName;
    const cover = snapshot?.media[0];
    const canSubmit = (snapshot?.media.length ?? 0) >= minimumMedia;

    return (
        <OnboardingFrame
            step={5}
            accountLabel={accountLabel}
            contentWidth={480}
            note="Once approved you go Live — same dashboard as every account, plus your crew profile."
        >
            <Typography.Text style={{ color: copyThat.pink, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em' }}>
                STEP 5 OF 6
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: '4px 0 0', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Review & go live
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 18px', fontSize: 14 }}>
                Click your profile to preview it exactly as clients see it — then submit, or go back.
            </Typography.Paragraph>

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
            ) : !snapshot || !user ? (
                <Spin size="large" description="Loading your profile…" />
            ) : (
                <>
                    <button type="button" className="review-card" aria-label="Preview your full profile" onClick={() => navigate(profilePath)}>
                        <div className="review-cover">
                            {session && cover ? <CoverImage item={cover} accessToken={session.accessToken} /> : <span className="review-cover-fallback">Video</span>}
                            <span className="review-play" aria-hidden="true">
                                <CaretRightFilled />
                            </span>
                        </div>
                        <div className="review-body">
                            <Flex align="center" gap={10}>
                                <span className="review-avatar" aria-hidden="true">
                                    {photoUrl ? <img src={photoUrl} alt="" onError={() => setPhotoUrl(null)} /> : initials(user.first_name, user.last_name)}
                                </span>
                                <Flex vertical gap={2} style={{ minWidth: 0 }}>
                                    <span className="review-name">{headline}</span>
                                    <span className="review-meta">
                                        {reviewMeta(snapshot)}
                                    </span>
                                </Flex>
                            </Flex>
                            {snapshot.typeNames.length > 0 ? (
                                <div className="review-types">
                                    {snapshot.typeNames.map((name) => (
                                        <span key={name} className="review-type">{name}</span>
                                    ))}
                                </div>
                            ) : null}
                            <span className="review-open">
                                <EyeOutlined />
                                Click to preview your full profile
                                <ArrowRightOutlined />
                            </span>
                        </div>
                    </button>

                    <Flex vertical gap={12} style={{ marginTop: 18 }}>
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
                        <Button
                            htmlType="button"
                            className="review-back"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate(onboardingMediaPath)}
                        >
                            Go back
                        </Button>
                    </Flex>
                </>
            )}

            <Typography.Paragraph className="review-footnote">
                Review takes ~24h — you'll show as “Pending review” until approved.
            </Typography.Paragraph>
        </OnboardingFrame>
    );
}

function CoverImage({ item, accessToken }: { item: UserMedia; accessToken: string }) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        let url: string | null = null;
        setSrc(null);
        void getMediaThumbnail(accessToken, item.id).then((blob) => {
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
    }, [accessToken, item.id]);

    if (!src) {
        return <span className="review-cover-fallback">Video</span>;
    }

    return <img src={src} alt="" />;
}

function reviewMeta(snapshot: ReviewSnapshot): string {
    const credits = snapshot.creditCount === 1 ? '1 credit' : `${snapshot.creditCount} credits`;
    return [
        snapshot.unionLabel,
        snapshot.rateLabel,
        snapshot.cityLabel,
        credits,
        `${snapshot.media.length} media`,
    ].filter((part): part is string => Boolean(part)).join(' · ');
}

function formatCity(locales: UserLocale[], cities: ProductionCity[]): string | null {
    const home = locales.find((locale) => locale.home_city) ?? locales[0];
    if (!home) {
        return null;
    }
    const name = cities.find((city) => city.id === home.production_city_id)?.name;
    if (!name) {
        return null;
    }
    const extra = locales.length - 1;
    return extra > 0 ? `${name} + ${extra}` : name;
}

function formatRate(amount: number | null, currency: Currency | undefined): string | null {
    if (amount === null || !currency) {
        return null;
    }
    const digits = Number.isInteger(amount) ? 0 : 2;
    const formatted = amount.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
    const symbol = currencySymbols[currency.code];
    return symbol ? `${symbol}${formatted}/day` : `${formatted} ${currency.code}/day`;
}

function initials(first: string, last: string): string {
    return `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase();
}

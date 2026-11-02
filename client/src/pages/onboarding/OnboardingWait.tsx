import { ClockCircleOutlined } from '@ant-design/icons';
import type { Currency, ProductionCity, UserLocale } from '@sugarcube/schema';
import { Button, Flex, Result, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { listCurrencies, listPositions, listProductionCities, listProjectTypes } from '../../api/catalog.ts';
import { listMedia } from '../../api/media.ts';
import {
    getProfilePhotoUrl,
    getWorkProfile,
    listLocales,
    listWorkProfiles,
    type UnionStatus,
} from '../../api/me.ts';
import { listProjectProjectTypes, listProjects } from '../../api/projects.ts';
import { useAppSelector, useSession } from '../../store/hooks.ts';
import { copyThat } from '../../theme.ts';
import { OnboardingFrame } from './OnboardingFrame.tsx';

export const onboardingWaitPath = '/onboarding/wait';

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

type WaitSnapshot = {
    positionName: string | null;
    unionLabel: string;
    rateLabel: string | null;
    cityLabel: string | null;
    typeNames: string[];
    creditCount: number;
    mediaCount: number;
};

export function OnboardingWait() {
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    const [snapshot, setSnapshot] = useState<WaitSnapshot | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

    useEffect(() => {
        document.title = 'Waiting for approval';
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
                    positionName: positionId ? positions.find((row) => row.id === positionId)?.name ?? null : null,
                    unionLabel: unionLabels[rates.union_status],
                    rateLabel: formatRate(rates.day_rate, currency),
                    cityLabel: formatCity(locales, cities),
                    typeNames: projectTypes.filter((row) => selected.has(row.id)).map((row) => row.name),
                    creditCount: projects.length,
                    mediaCount: media.length,
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
        let timer = 0;
        setPhotoUrl(null);

        function load(): void {
            if (!active) {
                return;
            }
            void getProfilePhotoUrl(token).then((link) => {
                if (!active) {
                    return;
                }
                setPhotoUrl(link.url);
                const refreshIn = Math.max((link.expires_in - 60) * 1000, 15_000);
                timer = window.setTimeout(load, refreshIn);
            }).catch(() => {
                if (active) {
                    setPhotoUrl(null);
                }
            });
        }

        load();

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [session, user?.photo]);

    const accountLabel = user?.account_type === 'client' ? 'CLIENT SETUP' : 'CREW SETUP';
    const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
    const headline = snapshot?.positionName ? `${displayName} — ${snapshot.positionName}` : displayName;

    return (
        <OnboardingFrame
            step={6}
            accountLabel={accountLabel}
            contentWidth={480}
            note="Once approved you go Live — same dashboard as every account, plus your crew profile."
        >
            <Typography.Text style={{ color: copyThat.pink, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em' }}>
                STEP 6 OF 6
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: '4px 0 0', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Waiting for approval
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 18px', fontSize: 14 }}>
                Please wait while an administrator approves your account.
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
                <div className="review-card is-static">
                    <div className="review-cover">
                        {photoUrl ? (
                            <img src={photoUrl} alt="" onError={() => setPhotoUrl(null)} />
                        ) : (
                            <span className="review-cover-fallback">{initials(user.first_name, user.last_name)}</span>
                        )}
                    </div>
                    <div className="review-body">
                        <Flex align="center" gap={10}>
                            <span className="review-avatar" aria-hidden="true">
                                {photoUrl ? <img src={photoUrl} alt="" onError={() => setPhotoUrl(null)} /> : initials(user.first_name, user.last_name)}
                            </span>
                            <Flex vertical gap={2} style={{ minWidth: 0 }}>
                                <span className="review-name">{headline}</span>
                                <span className="review-meta">{waitMeta(snapshot)}</span>
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
                            <ClockCircleOutlined />
                            Pending review
                        </span>
                    </div>
                </div>
            )}

            <Typography.Paragraph className="review-footnote">
                Review takes ~24h — you'll show as “Pending review” until approved.
            </Typography.Paragraph>
        </OnboardingFrame>
    );
}

function waitMeta(snapshot: WaitSnapshot): string {
    const credits = snapshot.creditCount === 1 ? '1 credit' : `${snapshot.creditCount} credits`;
    const media = snapshot.mediaCount === 1 ? '1 media' : `${snapshot.mediaCount} media`;
    return [
        snapshot.unionLabel,
        snapshot.rateLabel,
        snapshot.cityLabel,
        credits,
        media,
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

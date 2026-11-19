import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { ProfileUnavailability, WorkProfileChoice } from '@sugarcube/schema';
import { Button, Calendar, ConfigProvider, Result, Select, Spin } from 'antd';
import type { ThemeConfig } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { listProfileUnavailability } from '../../api/availability.ts';
import { listWorkProfiles } from '../../api/me.ts';
import { Frame } from '../../components/Frame.tsx';
import { ProfileUnavailableDialog } from '../onboarding/AvailabilityCalendar.tsx';
import { useSession } from '../../store/hooks.ts';

const rangeLimit = 3660;
const visibleChips = 2;
const allProfiles = 'all';

const calendarTheme: ThemeConfig = {
    token: {
        colorPrimary: '#16130e',
        colorInfo: '#16130e',
        colorLink: '#16130e',
        colorText: '#16130e',
        colorTextSecondary: '#8a8172',
        colorBorder: '#ddd8cc',
        colorBgContainer: '#ffffff',
        borderRadius: 12,
        fontFamily: 'var(--font-text)',
        controlOutline: 'rgba(22, 19, 14, 0.12)',
    },
    components: {
        Select: {
            activeBorderColor: '#16130e',
            hoverBorderColor: '#cfc6b8',
            optionSelectedBg: '#f6f1e8',
            optionSelectedColor: '#16130e',
            optionActiveBg: '#fdfbf6',
        },
        Button: {
            primaryShadow: 'none',
            defaultShadow: 'none',
        },
    },
};

type CalendarData = {
    profiles: WorkProfileChoice[];
    blocks: ProfileUnavailability[];
};

export function CalendarPage() {
    const session = useSession();
    const token = session?.accessToken ?? null;
    const [month, setMonth] = useState(() => dayjs().startOf('month'));
    const [profileId, setProfileId] = useState(allProfiles);
    const [data, setData] = useState<CalendarData | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [editorOpen, setEditorOpen] = useState(false);

    useEffect(() => {
        document.title = 'Calendar';
    }, []);

    useEffect(() => {
        if (!token) {
            return;
        }

        let active = true;
        setLoadError(null);
        Promise.all([
            listWorkProfiles(token),
            listProfileUnavailability(token),
        ]).then(
            ([profiles, blocks]) => {
                if (active) {
                    setData({ profiles, blocks });
                }
            },
            (error: unknown) => {
                if (active) {
                    setData(null);
                    setLoadError(error instanceof Error ? error.message : 'Could not load your calendar.');
                }
            },
        );

        return () => {
            active = false;
        };
    }, [attempt, token]);

    const profiles = data?.profiles ?? [];
    const blocks = useMemo(() => {
        const rows = (data?.blocks ?? []).filter((row) => row.code === 'unavailable');
        if (profileId === allProfiles) {
            return rows;
        }
        return rows.filter((row) => row.work_profile_id === profileId);
    }, [data, profileId]);
    const editorProfileId = profileId !== allProfiles ? profileId : profiles[0]?.id ?? '';
    const byDay = useMemo(() => blocksByDay(blocks, month), [blocks, month]);
    const upcoming = useMemo(() => upcomingBlocks(blocks), [blocks]);
    const profileOptions = useMemo(() => [
        { value: allProfiles, label: 'All profiles' },
        ...profiles.map((profile) => ({ value: profile.id, label: profileLabel(profile) })),
    ], [profiles]);

    useEffect(() => {
        if (profileId !== allProfiles && data && !data.profiles.some((profile) => profile.id === profileId)) {
            setProfileId(allProfiles);
        }
    }, [data, profileId]);

    let body;
    if (loadError) {
        body = (
            <Result
                status="error"
                title="Could not load your calendar"
                subTitle={loadError}
                extra={(
                    <Button type="primary" onClick={() => setAttempt((value) => value + 1)}>
                        Try again
                    </Button>
                )}
            />
        );
    } else if (!data) {
        body = (
            <div className="calendar-loading">
                <Spin size="large" description="Loading your calendar…" />
            </div>
        );
    } else {
        body = (
            <div className="calendar-page">
                <header className="calendar-toolbar">
                    <h1>Calendar</h1>
                    <Select
                        className="calendar-filter"
                        classNames={{ popup: { root: 'calendar-filter-popup' } }}
                        value={profileId}
                        options={profileOptions}
                        aria-label="Work profile"
                        popupMatchSelectWidth={false}
                        onChange={setProfileId}
                    />
                    <div className="calendar-nav">
                        <button
                            type="button"
                            className="calendar-step"
                            aria-label="Previous month"
                            onClick={() => setMonth((current) => current.subtract(1, 'month'))}
                        >
                            <LeftOutlined />
                        </button>
                        <span className="calendar-month-label">{month.format('MMMM YYYY')}</span>
                        <button
                            type="button"
                            className="calendar-step"
                            aria-label="Next month"
                            onClick={() => setMonth((current) => current.add(1, 'month'))}
                        >
                            <RightOutlined />
                        </button>
                        <button
                            type="button"
                            className="calendar-today"
                            onClick={() => setMonth(dayjs().startOf('month'))}
                        >
                            Today
                        </button>
                    </div>
                </header>
                <div className="calendar-layout">
                    <Calendar
                        className="calendar-board"
                        fullscreen
                        mode="month"
                        value={month}
                        headerRender={() => null}
                        onChange={() => undefined}
                        onPanelChange={() => undefined}
                        fullCellRender={(date, info) => {
                            if (info.type !== 'date') {
                                return info.originNode;
                            }
                            return (
                                <CalendarDay
                                    date={date}
                                    month={month}
                                    blocks={byDay.get(date.format('YYYY-MM-DD')) ?? []}
                                />
                            );
                        }}
                    />
                    <aside className="calendar-side" aria-label="Upcoming unavailability">
                        <h2>Upcoming</h2>
                        <Button
                            htmlType="button"
                            className="availability-set"
                            disabled={profiles.length === 0}
                            onClick={() => setEditorOpen(true)}
                        >
                            Update calendar
                        </Button>
                        {upcoming.length === 0 ? (
                            <p className="calendar-empty">No upcoming unavailability.</p>
                        ) : (
                            <ul className="calendar-upcoming">
                                {upcoming.map((block) => (
                                    <li key={block.id}>
                                        <p className="calendar-upcoming-date">{rangeLabel(block.from_date, block.to_date)}</p>
                                        <p className="calendar-upcoming-title">Not available</p>
                                        <p className="calendar-upcoming-meta">{profileLabel(block)}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </aside>
                </div>
            </div>
        );
    }

    const sheet = (
        <>
            {body}
            {token && data ? (
                <ProfileUnavailableDialog
                    open={editorOpen}
                    profiles={data.profiles}
                    blocks={data.blocks}
                    profileId={editorProfileId}
                    accessToken={token}
                    onClose={() => setEditorOpen(false)}
                    onSaved={() => {
                        setEditorOpen(false);
                        setAttempt((value) => value + 1);
                    }}
                />
            ) : null}
        </>
    );

    return (
        <Frame>
            <ConfigProvider theme={calendarTheme}>{sheet}</ConfigProvider>
        </Frame>
    );
}

function CalendarDay({
    date,
    month,
    blocks,
}: {
    date: Dayjs;
    month: Dayjs;
    blocks: ProfileUnavailability[];
}) {
    if (!date.isSame(month, 'month')) {
        return <div className="calendar-day is-outside" />;
    }

    const today = date.isSame(dayjs(), 'day');
    const shown = blocks.slice(0, visibleChips);
    const extra = blocks.length - shown.length;

    return (
        <div className="calendar-day">
            <span className={today ? 'calendar-day-num is-today' : 'calendar-day-num'}>{date.date()}</span>
            {shown.map((block) => {
                const name = profileLabel(block);
                return (
                    <span key={block.work_profile_id} className="calendar-chip" title={`Not available · ${name}`}>
                        <span className="calendar-chip-state">Not available</span>
                        <span className="calendar-chip-profile">{name}</span>
                    </span>
                );
            })}
            {extra > 0 ? <span className="calendar-more">+{extra} more</span> : null}
        </div>
    );
}

function profileLabel(profile: {
    title: string | null;
    position: string | null;
    city: string | null;
}): string {
    const title = profile.title?.trim();
    if (title) {
        return title;
    }
    return [profile.position, profile.city].filter((part): part is string => Boolean(part)).join(' · ') || 'Your profile';
}

function blocksByDay(rows: ProfileUnavailability[], month: Dayjs): Map<string, ProfileUnavailability[]> {
    const days = new Map<string, ProfileUnavailability[]>();
    const start = month.startOf('month');
    const end = month.endOf('month');
    for (const row of rows) {
        let cursor = dayjs(row.from_date);
        const last = dayjs(row.to_date);
        if (!cursor.isValid() || !last.isValid() || last.isBefore(cursor, 'day')) {
            continue;
        }
        if (last.isBefore(start, 'day') || cursor.isAfter(end, 'day')) {
            continue;
        }
        if (cursor.isBefore(start, 'day')) {
            cursor = start;
        }
        const stop = last.isAfter(end, 'day') ? end : last;
        for (let count = 0; count < rangeLimit && !cursor.isAfter(stop, 'day'); count += 1) {
            const key = cursor.format('YYYY-MM-DD');
            const list = days.get(key) ?? [];
            if (!list.some((item) => item.work_profile_id === row.work_profile_id)) {
                list.push(row);
            }
            days.set(key, list);
            cursor = cursor.add(1, 'day');
        }
    }
    return days;
}

function upcomingBlocks(rows: ProfileUnavailability[]): ProfileUnavailability[] {
    const today = dayjs().format('YYYY-MM-DD');
    return rows
        .filter((row) => row.to_date >= today)
        .slice()
        .sort((left, right) => left.from_date.localeCompare(right.from_date)
            || left.to_date.localeCompare(right.to_date)
            || profileLabel(left).localeCompare(profileLabel(right)));
}

function rangeLabel(from: string, to: string): string {
    const start = dayjs(from);
    const end = dayjs(to);
    if (!start.isValid() || !end.isValid() || from === to) {
        return start.format('MMM D').toUpperCase();
    }
    if (start.isSame(end, 'month')) {
        return `${start.format('MMM D').toUpperCase()} – ${end.format('D')}`;
    }
    if (start.isSame(end, 'year')) {
        return `${start.format('MMM D').toUpperCase()} – ${end.format('MMM D').toUpperCase()}`;
    }
    return `${start.format('MMM D, YYYY').toUpperCase()} – ${end.format('MMM D, YYYY').toUpperCase()}`;
}

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { UserAvailability } from '@sugarcube/schema';
import { App as AntdApp, Button, Calendar, Modal } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { saveUnavailable } from '../../api/availability.ts';

const rangeLimit = 3660;

type AvailabilityCalendarProps = {
    rows: UserAvailability[];
    appliesTo: string;
    editable: boolean;
    accessToken: string;
    onSaved: (rows: UserAvailability[]) => void;
};

export function AvailabilityCalendar({ rows, appliesTo, editable, accessToken, onSaved }: AvailabilityCalendarProps) {
    const [month, setMonth] = useState(() => dayjs());
    const [open, setOpen] = useState(false);
    const days = useMemo(() => daysInRange(rows), [rows]);

    return (
        <aside className="availability-card" aria-label="Your availability">
            <h2>Your availability</h2>
            <MonthCalendar month={month} onMonth={setMonth} days={days} />
            <ul className="availability-legend">
                <li><span className="availability-swatch" /> Available</li>
                <li><span className="availability-swatch is-blocked" /> Blocked</li>
                <li><span className="availability-swatch is-booked" /> Booked</li>
            </ul>
            {editable ? (
                <Button htmlType="button" className="availability-set" onClick={() => setOpen(true)}>
                    Update Calendar
                </Button>
            ) : null}
            <SetAvailabilityModal
                open={open}
                rows={rows}
                appliesTo={appliesTo}
                accessToken={accessToken}
                onClose={() => setOpen(false)}
                onSaved={(saved) => {
                    onSaved(saved);
                    setOpen(false);
                }}
            />
        </aside>
    );
}

function SetAvailabilityModal({
    open,
    rows,
    appliesTo,
    accessToken,
    onClose,
    onSaved,
}: {
    open: boolean;
    rows: UserAvailability[];
    appliesTo: string;
    accessToken: string;
    onClose: () => void;
    onSaved: (rows: UserAvailability[]) => void;
}) {
    const { message } = AntdApp.useApp();
    const [month, setMonth] = useState(() => dayjs());
    const [draft, setDraft] = useState<Set<string>>(() => new Set());
    const [saving, setSaving] = useState(false);
    const drag = useRef<{ blocking: boolean } | null>(null);
    const booked = useMemo(() => bookedDays(rows), [rows]);

    useEffect(() => {
        if (!open) {
            return;
        }
        setMonth(dayjs());
        setDraft(unavailableDays(rows));
        drag.current = null;
    }, [open, rows]);

    useEffect(() => {
        function stop(): void {
            drag.current = null;
        }
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
        return () => {
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', stop);
        };
    }, []);

    function paint(day: string, blocking: boolean): void {
        if (booked.has(day)) {
            return;
        }
        setDraft((current) => {
            const next = new Set(current);
            if (blocking) {
                next.add(day);
            } else {
                next.delete(day);
            }
            return next;
        });
    }

    async function onSave(): Promise<void> {
        setSaving(true);
        try {
            const saved = await saveUnavailable(accessToken, [...draft]);
            onSaved(saved);
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : 'Could not save your availability.');
        } finally {
            setSaving(false);
        }
    }

    const days = useMemo(() => {
        const marked = new Map<string, UserAvailability['code']>();
        for (const day of booked) {
            marked.set(day, 'booked');
        }
        for (const day of draft) {
            if (!marked.has(day)) {
                marked.set(day, 'unavailable');
            }
        }
        return marked;
    }, [booked, draft]);

    return (
        <Modal
            title="Set your availability"
            open={open}
            okText="Save availability"
            cancelText="Cancel"
            confirmLoading={saving}
            destroyOnHidden
            width={440}
            onOk={() => void onSave()}
            onCancel={() => {
                if (!saving) {
                    onClose();
                }
            }}
        >
            <p className="availability-note">
                Drag across days to block them out. Booked days come from confirmed projects.
            </p>
            <p className="availability-applies">Applies to</p>
            <span className="availability-profile">{appliesTo || 'Your work profile'}</span>
            <div className="availability-dialog">
                <MonthCalendar
                    month={month}
                    onMonth={setMonth}
                    days={days}
                    onPointerDown={(day, blocked) => {
                        if (blocked) {
                            return;
                        }
                        const blocking = !draft.has(day);
                        drag.current = { blocking };
                        paint(day, blocking);
                    }}
                    onPointerEnter={(day, blocked) => {
                        if (!drag.current || blocked) {
                            return;
                        }
                        paint(day, drag.current.blocking);
                    }}
                />
            </div>
            <ul className="availability-legend">
                <li><span className="availability-swatch" /> Available</li>
                <li><span className="availability-swatch is-blocked" /> Blocked</li>
                <li><span className="availability-swatch is-booked" /> Booked</li>
            </ul>
        </Modal>
    );
}

function MonthCalendar({
    month,
    onMonth,
    days,
    onPointerDown,
    onPointerEnter,
}: {
    month: Dayjs;
    onMonth: (month: Dayjs) => void;
    days: Map<string, UserAvailability['code']>;
    onPointerDown?: (day: string, blocked: boolean) => void;
    onPointerEnter?: (day: string, blocked: boolean) => void;
}) {
    return (
        <Calendar
            className="availability-month"
            fullscreen={false}
            value={month}
            onChange={onMonth}
            onPanelChange={onMonth}
            headerRender={({ value, onChange }) => (
                <div className="availability-header">
                    <span>{value.format('MMMM YYYY')}</span>
                    <span className="availability-nav">
                        <button
                            type="button"
                            aria-label="Previous month"
                            onClick={() => onChange(value.subtract(1, 'month'))}
                        >
                            <LeftOutlined />
                        </button>
                        <button
                            type="button"
                            aria-label="Next month"
                            onClick={() => onChange(value.add(1, 'month'))}
                        >
                            <RightOutlined />
                        </button>
                    </span>
                </div>
            )}
            fullCellRender={(date, info) => {
                if (info.type !== 'date') {
                    return info.originNode;
                }
                return (
                    <AvailabilityDay
                        date={date}
                        month={month}
                        days={days}
                        onPointerDown={onPointerDown}
                        onPointerEnter={onPointerEnter}
                    />
                );
            }}
        />
    );
}

function AvailabilityDay({
    date,
    month,
    days,
    onPointerDown,
    onPointerEnter,
}: {
    date: Dayjs;
    month: Dayjs;
    days: Map<string, UserAvailability['code']>;
    onPointerDown?: (day: string, blocked: boolean) => void;
    onPointerEnter?: (day: string, blocked: boolean) => void;
}) {
    const inMonth = date.isSame(month, 'month');
    const key = date.format('YYYY-MM-DD');
    const code = inMonth ? days.get(key) : undefined;
    const blocked = code === 'booked';
    const className = [
        'availability-day',
        inMonth ? '' : 'is-outside',
        code === 'booked' ? 'is-booked' : '',
        code === 'unavailable' ? 'is-blocked' : '',
    ].filter(Boolean).join(' ');

    if (!inMonth || !onPointerDown) {
        return <div className={className}>{inMonth ? date.date() : ''}</div>;
    }

    return (
        <button
            type="button"
            className={className}
            aria-pressed={code === 'unavailable'}
            aria-label={blocked ? `${date.format('MMMM D')}, booked` : date.format('MMMM D')}
            disabled={blocked}
            onPointerDown={(event) => {
                event.preventDefault();
                onPointerDown(key, blocked);
            }}
            onPointerEnter={() => onPointerEnter?.(key, blocked)}
        >
            {date.date()}
        </button>
    );
}

function unavailableDays(rows: UserAvailability[]): Set<string> {
    const days = new Set<string>();
    for (const [day, code] of daysInRange(rows)) {
        if (code === 'unavailable') {
            days.add(day);
        }
    }
    return days;
}

function bookedDays(rows: UserAvailability[]): Set<string> {
    const days = new Set<string>();
    for (const [day, code] of daysInRange(rows)) {
        if (code === 'booked') {
            days.add(day);
        }
    }
    return days;
}

function daysInRange(rows: UserAvailability[]): Map<string, UserAvailability['code']> {
    const days = new Map<string, UserAvailability['code']>();
    for (const row of rows) {
        let cursor = dayjs(row.from_date);
        const end = dayjs(row.to_date);
        if (!cursor.isValid() || !end.isValid() || end.isBefore(cursor, 'day')) {
            continue;
        }
        for (let count = 0; count < rangeLimit && !cursor.isAfter(end, 'day'); count += 1) {
            const key = cursor.format('YYYY-MM-DD');
            if (days.get(key) !== 'booked') {
                days.set(key, row.code);
            }
            cursor = cursor.add(1, 'day');
        }
    }
    return days;
}

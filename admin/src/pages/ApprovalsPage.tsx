import { CheckOutlined } from '@ant-design/icons';
import { Alert, App as AntdApp, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { approveUser, listApprovals, requestChanges, type Approval } from '../api/users.ts';
import { RequestChangesDialog } from '../components/RequestChangesDialog.tsx';
import { openProfile } from './UserProfilePage.tsx';
import { useFrameDetail } from '../components/Navigator.tsx';
import { useSession } from '../session/SessionProvider.tsx';

type FilterId = 'all' | 'film' | 'post';

const filters: { id: FilterId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'film', label: 'Crew · Film' },
    { id: 'post', label: 'Crew · Post' },
];

export function ApprovalsPage() {
    const { message } = AntdApp.useApp();
    const session = useSession();
    const navigate = useNavigate();
    const setFrameDetail = useFrameDetail();
    const accessToken = session?.accessToken;
    const [approvals, setApprovals] = useState<Approval[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterId>('all');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [changesFor, setChangesFor] = useState<Approval | null>(null);

    useEffect(() => {
        document.title = 'Approvals — Sugarcube Admin';
    }, []);

    useEffect(() => {
        if (!accessToken) {
            return;
        }

        let cancelled = false;
        listApprovals(accessToken).then(
            (rows) => {
                if (!cancelled) {
                    setApprovals(rows);
                    setLoading(false);
                }
            },
            (cause: unknown) => {
                if (!cancelled) {
                    setError(cause instanceof Error ? cause.message : 'Could not load approvals.');
                    setLoading(false);
                }
            },
        );

        return () => {
            cancelled = true;
        };
    }, [accessToken]);

    useEffect(() => {
        setFrameDetail(loading ? null : `${approvals.length.toLocaleString()} pending`);
        return () => setFrameDetail(null);
    }, [approvals.length, loading, setFrameDetail]);

    const visible = approvals.filter((item) => matches(item, filter));

    async function approve(item: Approval): Promise<void> {
        if (!accessToken || busyId) {
            return;
        }

        setBusyId(item.id);
        try {
            await approveUser(accessToken, item.id);
            setApprovals((rows) => rows.filter((row) => row.id !== item.id));
            message.success(`${displayName(item)} is now live.`);
        } catch (cause: unknown) {
            message.error(cause instanceof Error ? cause.message : 'Could not approve this profile.');
        } finally {
            setBusyId(null);
        }
    }

    function openChanges(item: Approval): void {
        if (!accessToken || busyId) {
            return;
        }
        if (item.status !== 'admin-review') {
            message.info(`${displayName(item)} is already in review and can still make changes.`);
            return;
        }
        setChangesFor(item);
    }

    async function sendBack(note: string): Promise<void> {
        const item = changesFor;
        if (!accessToken || !item || busyId || item.status !== 'admin-review') {
            return;
        }

        setBusyId(item.id);
        try {
            const updated = await requestChanges(accessToken, item.id, note);
            setApprovals((rows) => rows.map((row) => row.id === item.id
                ? { ...row, status: updated.status, updated_at: updated.updated_at }
                : row));
            setChangesFor(null);
            message.success(`Asked ${displayName(item)} to make changes.`);
        } catch (cause: unknown) {
            message.error(cause instanceof Error ? cause.message : 'Could not request changes.');
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="approvals">
            {error ? <Alert type="error" showIcon message={error} /> : null}
            <div className="approval-filters" role="tablist" aria-label="Approval groups">
                {filters.map((item) => {
                    const count = approvals.filter((row) => matches(row, item.id)).length;
                    const selected = filter === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            className={selected ? 'approval-chip is-on' : 'approval-chip'}
                            onClick={() => setFilter(item.id)}
                        >
                            {item.label} {count.toLocaleString()}
                        </button>
                    );
                })}
            </div>
            {loading ? (
                <div className="approval-loading"><Spin /></div>
            ) : visible.length === 0 ? (
                <p className="approval-empty">
                    {approvals.length === 0 ? 'No profiles are waiting for approval.' : 'No profiles in this group.'}
                </p>
            ) : (
                <div className="approval-grid">
                    {visible.map((item) => (
                        <article key={item.id} className="approval-card">
                            <div className="approval-head">
                                <Portrait name={displayName(item)} url={item.photo_url} />
                                <div>
                                    <h2 className="approval-name">
                                        {displayName(item)}
                                        <Badge discipline={item.discipline} />
                                    </h2>
                                    {item.position ? <p className="approval-role">{item.position}</p> : null}
                                    {item.city ? <p className="approval-city">{item.city}</p> : null}
                                </div>
                            </div>
                            <p className="approval-meta">{metaLine(item)}</p>
                            <p className="approval-note">{statusLine(item)}</p>
                            <div className="approval-actions">
                                <button
                                    type="button"
                                    className="approval-go"
                                    disabled={busyId === item.id}
                                    onClick={() => void approve(item)}
                                >
                                    <CheckOutlined />
                                    Approve — go live
                                </button>
                                <button
                                    type="button"
                                    className="approval-quiet"
                                    disabled={busyId === item.id}
                                    onClick={() => openChanges(item)}
                                >
                                    Request changes
                                </button>
                                <button
                                    type="button"
                                    className="approval-reject"
                                    disabled={busyId === item.id}
                                    onClick={() => message.info('Rejection isn’t available yet.')}
                                >
                                    Reject
                                </button>
                                <button
                                    type="button"
                                    className="approval-view"
                                    onClick={() => {
                                        const destination = openProfile(item.id, 'approvals');
                                        navigate(destination.pathname, destination.options);
                                    }}
                                >
                                    View full profile
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
            <p className="approval-foot">
                Approve publishes the profile. Request changes emails the user and sends a submitted profile back so they can edit it.
            </p>
            <RequestChangesDialog
                user={changesFor}
                sending={changesFor !== null && busyId === changesFor.id}
                onClose={() => setChangesFor(null)}
                onSend={(note) => void sendBack(note)}
            />
        </div>
    );
}

function Portrait({ name, url }: { name: string; url: string | null }) {
    const [failed, setFailed] = useState(false);
    if (!url || failed) {
        return <span className="approval-photo approval-photo-fallback" aria-hidden="true">{initials(name)}</span>;
    }

    return <img className="approval-photo" src={url} alt="" onError={() => setFailed(true)} />;
}

function Badge({ discipline }: { discipline: string | null }) {
    if (discipline === 'Shooting') {
        return <span className="approval-badge approval-badge-film">Film</span>;
    }
    if (discipline === 'Post Production') {
        return <span className="approval-badge approval-badge-post">Post</span>;
    }
    return null;
}

function matches(item: Approval, filter: FilterId): boolean {
    if (filter === 'film') {
        return item.discipline === 'Shooting';
    }
    if (filter === 'post') {
        return item.discipline === 'Post Production';
    }
    return true;
}

function displayName(item: Approval): string {
    return `${item.first_name} ${item.last_name}`.trim();
}

function initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function metaLine(item: Approval): string {
    const credits = `${item.credit_count.toLocaleString()} ${item.credit_count === 1 ? 'credit' : 'credits'}`;
    return [formatRate(item.day_rate, item.currency_code), unionLabel(item.union_status), credits, `${item.media_count.toLocaleString()} media`]
        .filter((part) => part.length > 0)
        .join(' · ');
}

function formatRate(amount: number | null, code: string | null): string {
    if (amount === null) {
        return '';
    }
    const digits = Number.isInteger(amount) ? 0 : 2;
    if (code) {
        try {
            return `${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: code,
                minimumFractionDigits: digits,
                maximumFractionDigits: digits,
            }).format(amount)}/day`;
        } catch {
            return `${amount.toLocaleString()} ${code}/day`;
        }
    }
    return `${amount.toLocaleString()}/day`;
}

function unionLabel(status: Approval['union_status']): string {
    if (status === 'union') {
        return 'Union';
    }
    if (status === 'non_union') {
        return 'Non-union';
    }
    if (status === 'either') {
        return 'Either';
    }
    return '';
}

function statusLine(item: Approval): string {
    const when = new Date(item.updated_at);
    const date = Number.isNaN(when.getTime())
        ? ''
        : when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const label = item.status === 'admin-review' ? 'Submitted' : 'In review';
    return date ? `${label} · ${date}` : label;
}

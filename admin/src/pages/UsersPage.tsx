import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Alert, App as AntdApp, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { approveUser, backToReview, listUsers, requestChanges, type DirectoryUser } from '../api/users.ts';
import { RequestChangesDialog } from '../components/RequestChangesDialog.tsx';
import { openProfile } from './UserProfilePage.tsx';
import { useFrameDetail } from '../components/Navigator.tsx';
import { useSession } from '../session/SessionProvider.tsx';

const pageSize = 9;

export function UsersPage() {
    const session = useSession();
    const accessToken = session?.accessToken;
    const navigate = useNavigate();
    const { message } = AntdApp.useApp();
    const [users, setUsers] = useState<DirectoryUser[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [changesFor, setChangesFor] = useState<DirectoryUser | null>(null);
    const setFrameDetail = useFrameDetail();

    useEffect(() => {
        document.title = 'Users — Sugarcube Admin';
    }, []);

    useEffect(() => {
        if (!accessToken) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        listUsers(accessToken)
            .then((rows) => {
                if (!cancelled) {
                    setUsers(rows);
                    setError(null);
                }
            })
            .catch((cause: unknown) => {
                if (!cancelled) {
                    setUsers([]);
                    setError(cause instanceof Error ? cause.message : 'Could not load users.');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [accessToken]);

    useEffect(() => {
        setFrameDetail(loading ? null : users.length.toLocaleString());
        return () => setFrameDetail(null);
    }, [loading, setFrameDetail, users.length]);

    const pageCount = Math.max(1, Math.ceil(users.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const start = (currentPage - 1) * pageSize;
    const visible = users.slice(start, start + pageSize);
    const pendingSelected = users.filter((user) => selected.includes(user.id) && canModerate(user));

    async function approve(user: DirectoryUser): Promise<void> {
        if (!accessToken || busyId || !canModerate(user)) {
            return;
        }
        setBusyId(user.id);
        try {
            const updated = await approveUser(accessToken, user.id);
            setUsers((rows) => rows.map((row) => row.id === updated.id
                ? { ...row, status: updated.status, updated_at: updated.updated_at }
                : row));
            message.success(`${displayName(updated)} is now live.`);
        } catch (cause: unknown) {
            message.error(cause instanceof Error ? cause.message : 'Could not approve this user.');
        } finally {
            setBusyId(null);
        }
    }

    function openChanges(user: DirectoryUser): void {
        if (!accessToken || busyId || !canModerate(user)) {
            return;
        }
        setChangesFor(user);
    }

    async function sendBack(note: string): Promise<void> {
        const user = changesFor;
        if (!accessToken || !user || busyId || !canModerate(user)) {
            return;
        }

        setBusyId(user.id);
        try {
            const updated = await requestChanges(accessToken, user.id, note);
            setUsers((rows) => rows.map((row) => row.id === updated.id
                ? { ...row, status: updated.status, updated_at: updated.updated_at }
                : row));
            setChangesFor(null);
            message.success(`Asked ${displayName(user)} to make changes.`);
        } catch (cause: unknown) {
            message.error(cause instanceof Error ? cause.message : 'Could not request changes.');
        } finally {
            setBusyId(null);
        }
    }

    async function moveBackToReview(user: DirectoryUser): Promise<void> {
        if (!accessToken || busyId || !canReturnToReview(user)) {
            return;
        }
        setBusyId(user.id);
        try {
            const updated = await backToReview(accessToken, user.id);
            setUsers((rows) => rows.map((row) => row.id === updated.id
                ? { ...row, status: updated.status, updated_at: updated.updated_at }
                : row));
            message.success(`${displayName(updated)} is back in review.`);
        } catch (cause: unknown) {
            message.error(cause instanceof Error ? cause.message : 'Could not move this user back to review.');
        } finally {
            setBusyId(null);
        }
    }

    async function approveSelected(): Promise<void> {
        if (!accessToken || busyId || pendingSelected.length === 0) {
            return;
        }
        setBusyId('bulk');
        try {
            for (const user of pendingSelected) {
                const updated = await approveUser(accessToken, user.id);
                setUsers((rows) => rows.map((row) => row.id === updated.id
                    ? { ...row, status: updated.status, updated_at: updated.updated_at }
                    : row));
            }
            const first = pendingSelected[0];
            setSelected([]);
            message.success(pendingSelected.length === 1 && first
                ? `${displayName(first)} is now live.`
                : `${pendingSelected.length} profiles are now live.`);
        } catch (cause: unknown) {
            message.error(cause instanceof Error ? cause.message : 'Could not approve the selected users.');
        } finally {
            setBusyId(null);
        }
    }

    const columns: TableColumnsType<DirectoryUser> = [
        {
            title: 'User',
            key: 'user',
            render: (_, user) => <UserCell user={user} />,
        },
        {
            title: 'Type',
            key: 'type',
            render: (_, user) => <TypeBadge user={user} />,
        },
        {
            title: 'Profiles',
            key: 'profiles',
            render: (_, user) => profileCount(user.profile_count),
        },
        {
            title: 'City',
            key: 'city',
            render: (_, user) => user.city ?? '—',
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, user) => <StatusBadge status={user.status} />,
        },
        {
            title: 'Stripe',
            key: 'stripe',
            render: () => '—',
        },
        {
            title: 'Joined',
            key: 'joined',
            render: (_, user) => formatJoined(user.created_at),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, user) => (
                <RowActions
                    user={user}
                    busy={busyId !== null}
                    onView={() => {
                        const destination = openProfile(user.id, 'users');
                        navigate(destination.pathname, destination.options);
                    }}
                    onApprove={() => void approve(user)}
                    onRequestChanges={() => openChanges(user)}
                    onBackToReview={() => void moveBackToReview(user)}
                    onReject={() => message.info('Rejection isn’t available yet.')}
                />
            ),
        },
    ];

    const from = users.length === 0 ? 0 : start + 1;
    const to = Math.min(start + pageSize, users.length);

    return (
        <div className="users-table">
            {error ? <Alert style={{ marginBottom: 16 }} type="error" message={error} showIcon /> : null}
            <Table<DirectoryUser>
                rowKey="id"
                columns={columns}
                dataSource={visible}
                loading={loading}
                pagination={false}
                scroll={{ x: 'max-content' }}
                rowSelection={{
                    selectedRowKeys: selected,
                    onChange: (keys) => {
                        const visibleIds = new Set(visible.map((user) => user.id));
                        setSelected((current) => [
                            ...current.filter((id) => !visibleIds.has(id)),
                            ...keys.map(String),
                        ]);
                    },
                }}
                locale={{ emptyText: 'No users yet.' }}
            />
            <div className="users-bar">
                <span>
                    Showing {from.toLocaleString()}–{to.toLocaleString()} of {users.length.toLocaleString()}
                    {selected.length > 0 ? ` · ${selected.length.toLocaleString()} selected` : ''}
                </span>
                <span className="users-bulk">
                    Bulk:
                    <button type="button" disabled={pendingSelected.length === 0 || busyId !== null} onClick={() => void approveSelected()}>
                        Approve
                    </button>
                </span>
                <span className="users-pager">
                    <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>‹ Prev</button>
                    <span>{currentPage.toLocaleString()} / {pageCount.toLocaleString()}</span>
                    <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Next ›</button>
                </span>
            </div>
            <p className="users-note">Status is the profile status. Approve, reject, and request changes are available when the status is admin-review. Back to Review is available when the status is admin-review or live and sets the profile status to review.</p>
            <RequestChangesDialog
                user={changesFor}
                sending={changesFor !== null && busyId === changesFor.id}
                onClose={() => setChangesFor(null)}
                onSend={(note) => void sendBack(note)}
            />
        </div>
    );
}

function UserCell({ user }: { user: DirectoryUser }) {
    const [failed, setFailed] = useState(false);
    return (
        <div className="user-cell">
            {user.photo_url && !failed ? (
                <img className="user-mark user-photo" src={user.photo_url} alt="" onError={() => setFailed(true)} />
            ) : (
                <span className="user-mark" aria-hidden="true">{initials(user)}</span>
            )}
            <span className="user-id">
                <span className="user-name">{displayName(user)}</span>
                <span className="user-email">{user.email}</span>
            </span>
        </div>
    );
}

function TypeBadge({ user }: { user: DirectoryUser }) {
    const type = typeOf(user);
    if (!type) {
        return '—';
    }
    return <span className={`user-type user-type-${type.tone}`}>{type.text}</span>;
}

function StatusBadge({ status }: { status: string }) {
    return <span className={`user-status user-status-${statusTone(status)}`}>{status}</span>;
}

function RowActions({
    user,
    busy,
    onView,
    onApprove,
    onRequestChanges,
    onBackToReview,
    onReject,
}: {
    user: DirectoryUser;
    busy: boolean;
    onView: () => void;
    onApprove: () => void;
    onRequestChanges: () => void;
    onBackToReview: () => void;
    onReject: () => void;
}) {
    const enabled = canModerate(user) && !busy;

    return (
        <div className="user-actions">
            <button type="button" className="user-approve" disabled={!enabled} onClick={onApprove}>
                <CheckOutlined />
                Approve
            </button>
            <button type="button" className="user-changes" disabled={!enabled} onClick={onRequestChanges}>
                Request changes
            </button>
            <button type="button" className="user-back" disabled={busy || !canReturnToReview(user)} onClick={onBackToReview}>
                Back to Review
            </button>
            <button type="button" className="user-reject" disabled={!enabled} onClick={onReject}>
                <CloseOutlined />
                Reject
            </button>
            <button type="button" className="user-view" onClick={onView}>View</button>
        </div>
    );
}

function canModerate(user: DirectoryUser): boolean {
    return user.status === 'admin-review';
}

function canReturnToReview(user: DirectoryUser): boolean {
    return user.status === 'admin-review' || user.status === 'live';
}

function displayName(user: { first_name: string; last_name: string }): string {
    return [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';
}

function initials(user: DirectoryUser): string {
    return `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase() || '·';
}

function typeOf(user: DirectoryUser): { text: string; tone: string } | null {
    if (user.account_type === 'client') {
        return { text: 'Client', tone: 'client' };
    }
    if (user.account_type !== 'crew') {
        return null;
    }
    if (user.discipline === 'Shooting') {
        return { text: 'Crew · Film', tone: 'film' };
    }
    if (user.discipline === 'Post Production') {
        return { text: 'Crew · Post', tone: 'post' };
    }
    return { text: 'Crew', tone: 'crew' };
}

function statusTone(status: string): string {
    if (status === 'live') {
        return 'live';
    }
    if (status === 'admin-review') {
        return 'pending';
    }
    if (status === 'invisible') {
        return 'off';
    }
    return 'plain';
}

function profileCount(count: number): string {
    if (count === 0) {
        return '—';
    }
    return `${count.toLocaleString()} ${count === 1 ? 'profile' : 'profiles'}`;
}

function formatJoined(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const delta = Date.now() - date.getTime();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    if (delta >= 0 && delta < hour) {
        const minutes = Math.max(1, Math.round(delta / 60000));
        return `${minutes} min ago`;
    }
    if (delta >= 0 && delta < day) {
        const hours = Math.max(1, Math.round(delta / hour));
        return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
    }
    if (delta >= 0 && delta < 7 * day) {
        const days = Math.max(1, Math.round(delta / day));
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

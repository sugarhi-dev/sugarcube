import { ArrowLeftOutlined, ArrowRightOutlined, DeleteOutlined, EditOutlined, HolderOutlined, LinkOutlined, PictureOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { classifyMediaLink, mediaUrl, type UserMedia } from '@sugarcube/schema';
import { App as AntdApp, Button, Flex, Input, Modal, Progress, Result, Spin, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { createMedia, deleteMedia, getMediaThumbnail, listMedia, reorderMedia, updateMedia, uploadMedia } from '../../api/media.ts';
import { useAppSelector, useSession } from '../../store/hooks.ts';
import { copyThat } from '../../theme.ts';
import { OnboardingFrame } from './OnboardingFrame.tsx';

export const onboardingMediaPath = '/onboarding/media';

const minimumMedia = 5;
const thumbnailLimit = 8 * 1024 * 1024;
const videoLimit = 200 * 1024 * 1024;

type DragState = {
    id: string;
    pointerId: number;
    moved: boolean;
};

export function OnboardingMedia() {
    const session = useSession();
    const accountType = useAppSelector((state) => state.profile.user?.account_type);
    const accountLabel = accountType === 'client' ? 'CLIENT SETUP' : 'CREW SETUP';
    const { message } = AntdApp.useApp();
    const thumbRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLInputElement>(null);
    const uploadThumbRef = useRef<HTMLInputElement>(null);
    const uploadAbort = useRef<AbortController | null>(null);
    const itemsRef = useRef<UserMedia[]>([]);
    const dragRef = useRef<DragState | null>(null);
    const writes = useRef(Promise.resolve());
    const [items, setItems] = useState<UserMedia[]>([]);
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
    const [adding, setAdding] = useState(false);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editUrl, setEditUrl] = useState('');
    const [editError, setEditError] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        document.title = 'Upload your media';
    }, []);

    useEffect(() => {
        if (!session) {
            return;
        }

        const token = session.accessToken;
        let active = true;
        setReady(false);
        setLoadError(null);

        listMedia(token).then(
            (media) => {
                if (!active) {
                    return;
                }
                itemsRef.current = media;
                setItems(media);
                setReady(true);
            },
            (error: unknown) => {
                if (active) {
                    setLoadError(error instanceof Error ? error.message : 'Could not load your media.');
                }
            },
        );

        return () => {
            active = false;
        };
    }, [attempt, session]);

    function remember(next: UserMedia[]): void {
        itemsRef.current = next;
        setItems(next);
    }

    function enqueue(task: () => Promise<void>): void {
        writes.current = writes.current.then(task, task).catch((error: unknown) => {
            message.error(error instanceof Error ? error.message : 'Could not save your media.');
            setAttempt((value) => value + 1);
        });
    }

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
            remember([...itemsRef.current, created]);
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

    async function onAdd(): Promise<void> {
        if (!session || adding) {
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
        setAdding(true);
        try {
            await writes.current;
            const created = await createMedia(session.accessToken, parsed.url, thumbFile);
            remember([...itemsRef.current, created]);
            setLinkOpen(false);
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : 'Could not add that video.');
        } finally {
            setAdding(false);
        }
    }

    function moveTo(fromId: string, toIndex: number, persist: boolean): void {
        const current = itemsRef.current;
        const fromIndex = current.findIndex((item) => item.id === fromId);
        if (fromIndex < 0 || toIndex < 0 || toIndex >= current.length || fromIndex === toIndex) {
            return;
        }

        const next = current.slice();
        const [item] = next.splice(fromIndex, 1);
        if (!item) {
            return;
        }
        next.splice(toIndex, 0, item);
        remember(next);
        if (persist && session) {
            const token = session.accessToken;
            const ids = next.map((entry) => entry.id);
            enqueue(async () => {
                const saved = await reorderMedia(token, ids);
                if (sameOrder(itemsRef.current, ids)) {
                    remember(saved);
                }
            });
        }
    }

    function onEdit(item: UserMedia): void {
        setEditingId(item.id);
        setEditUrl(mediaUrl(item) ?? '');
        setEditError(null);
    }

    async function onSaveEdit(id: string): Promise<void> {
        if (!session || savingId) {
            return;
        }

        const parsed = classifyMediaLink(editUrl);
        if (!parsed) {
            setEditError('Paste a YouTube or Vimeo link.');
            return;
        }

        const token = session.accessToken;
        setSavingId(id);
        setEditError(null);
        try {
            await writes.current;
            const saved = await updateMedia(token, id, parsed.url);
            remember(itemsRef.current.map((item) => item.id === id ? saved : item));
            setEditingId((current) => current === id ? null : current);
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : 'Could not update that video.');
        } finally {
            setSavingId((current) => current === id ? null : current);
        }
    }

    function onPointerDown(event: React.PointerEvent<HTMLButtonElement>, id: string): void {
        if (event.button !== 0) {
            return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { id, pointerId: event.pointerId, moved: false };
        setDraggingId(id);
    }

    function onPointerMove(event: React.PointerEvent<HTMLButtonElement>): void {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }

        const overId = cardAt(event.clientX, event.clientY, drag.id);
        if (!overId) {
            return;
        }
        const toIndex = itemsRef.current.findIndex((item) => item.id === overId);
        const fromIndex = itemsRef.current.findIndex((item) => item.id === drag.id);
        if (toIndex < 0 || fromIndex === toIndex) {
            return;
        }
        moveTo(drag.id, toIndex, false);
        drag.moved = true;
    }

    function onPointerUp(event: React.PointerEvent<HTMLButtonElement>): void {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }
        dragRef.current = null;
        setDraggingId(null);
        if (!drag.moved || !session) {
            return;
        }

        const token = session.accessToken;
        const ids = itemsRef.current.map((item) => item.id);
        enqueue(async () => {
            const saved = await reorderMedia(token, ids);
            if (sameOrder(itemsRef.current, ids)) {
                remember(saved);
            }
        });
    }

    function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>, id: string): void {
        if (event.target !== event.currentTarget) {
            return;
        }
        const index = itemsRef.current.findIndex((item) => item.id === id);
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            moveTo(id, index - 1, true);
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault();
            moveTo(id, index + 1, true);
        }
    }

    function onRemove(id: string): void {
        if (!session || removingId) {
            return;
        }

        const token = session.accessToken;
        if (editingId === id) {
            setEditingId(null);
        }
        remember(itemsRef.current.filter((item) => item.id !== id));
        setRemovingId(id);
        enqueue(async () => {
            try {
                await deleteMedia(token, id);
            } finally {
                setRemovingId((current) => current === id ? null : current);
            }
        });
    }

    return (
        <OnboardingFrame
            step={4}
            accountLabel={accountLabel}
            contentWidth={680}
            note="Reels autoplay on your profile — paste a Vimeo or YouTube link and we handle the rest."
        >
            <Typography.Text style={{ color: copyThat.pink, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em' }}>
                STEP 4 OF 5
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: '4px 0 0', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Upload your media
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 18px', fontSize: 14 }}>
                Minimum 5 items to go live. Upload files or paste a Vimeo / YouTube link — reels autoplay on your profile.
            </Typography.Paragraph>

            {loadError ? (
                <Result
                    status="error"
                    title="Could not load your media"
                    subTitle={loadError}
                    extra={(
                        <Button type="primary" onClick={() => setAttempt((value) => value + 1)}>
                            Try again
                        </Button>
                    )}
                />
            ) : !ready ? (
                <Spin size="large" description="Loading your media…" />
            ) : (
                <>
                    <Flex className="media-toolbar" align="center" gap={10} wrap="wrap">
                        <Button htmlType="button" className="media-upload" icon={<UploadOutlined />} onClick={openUploadDialog}>
                            Upload
                        </Button>
                        <Button htmlType="button" className="media-add" icon={<LinkOutlined />} onClick={openLinkDialog}>
                            YouTube / Vimeo
                        </Button>
                        <span className="media-count">{mediaProgressLabel(items.length, minimumMedia)}</span>
                    </Flex>

                    <div className="media-grid" role="list" aria-label="Your videos">
                        {items.map((item, index) => {
                            const label = mediaLabel(item, index, items.length);
                            return (
                                <div
                                    key={item.id}
                                    className={draggingId === item.id ? 'media-card is-dragging' : 'media-card'}
                                    role="listitem"
                                    tabIndex={0}
                                    data-media-id={item.id}
                                    aria-label={label}
                                    aria-grabbed={draggingId === item.id}
                                    onKeyDown={(event) => onKeyDown(event, item.id)}
                                >
                                    {session ? <MediaPreview item={item} accessToken={session.accessToken} /> : null}
                                    <button
                                        type="button"
                                        className="media-card-grip"
                                        aria-label={`Move ${label}`}
                                        onPointerDown={(event) => onPointerDown(event, item.id)}
                                        onPointerMove={onPointerMove}
                                        onPointerUp={onPointerUp}
                                        onPointerCancel={onPointerUp}
                                    >
                                        <HolderOutlined />
                                    </button>
                                    <div className="media-card-actions">
                                        <button
                                            type="button"
                                            className="media-card-delete"
                                            aria-label={`Delete ${label}`}
                                            disabled={removingId === item.id}
                                            onClick={() => onRemove(item.id)}
                                        >
                                            <DeleteOutlined />
                                        </button>
                                        <button
                                            type="button"
                                            className="media-card-edit"
                                            aria-label={`Edit ${label}`}
                                            onClick={() => onEdit(item)}
                                        >
                                            <EditOutlined />
                                        </button>
                                    </div>
                                    {index === 0 ? <span className="media-card-cover">Cover</span> : null}
                                </div>
                            );
                        })}
                        <button type="button" className="media-slot" aria-label="Add a video" onClick={openLinkDialog}>
                            <PlusOutlined />
                        </button>
                    </div>
                    <Modal
                        title="Add a YouTube or Vimeo video"
                        open={linkOpen}
                        okText="Add"
                        cancelText="Cancel"
                        confirmLoading={adding}
                        destroyOnHidden
                        width={480}
                        onOk={() => {
                            void onAdd();
                        }}
                        onCancel={() => {
                            if (!adding) {
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
                                void onAdd();
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
                        open={editingId !== null}
                        okText="Save"
                        cancelText="Cancel"
                        confirmLoading={savingId !== null}
                        destroyOnHidden
                        width={440}
                        onOk={() => {
                            if (editingId) {
                                void onSaveEdit(editingId);
                            }
                        }}
                        onCancel={() => {
                            if (!savingId) {
                                setEditingId(null);
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
                </>
            )}

            <Typography.Paragraph type="secondary" style={{ margin: '16px 0 0', fontSize: 13 }}>
                Drag to reorder — the first item is your cover and autoplays at the top of your profile. Arrow keys move a selected video.
            </Typography.Paragraph>

            <Flex justify="space-between" align="center" style={{ marginTop: 28 }}>
                <Button type="text" htmlType="button" icon={<ArrowLeftOutlined />} style={{ color: copyThat.muted }}>
                    Back
                </Button>
                <Button
                    type="primary"
                    htmlType="button"
                    className="profile-continue"
                    icon={<ArrowRightOutlined />}
                    iconPlacement="end"
                    style={{
                        background: `linear-gradient(90deg, ${copyThat.pinkHot} 0%, ${copyThat.pink} 100%)`,
                        border: 'none',
                    }}
                >
                    Continue — review
                </Button>
            </Flex>
        </OnboardingFrame>
    );
}

function MediaPreview({ item, accessToken }: { item: UserMedia; accessToken: string }) {
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
        return <span className="media-card-fallback">{item.media_type === 'vimeo' ? 'Vimeo' : item.media_type === 'youtube' ? 'YouTube' : 'Uploaded'}</span>;
    }

    return (
        <img
            src={src}
            alt=""
            draggable={false}
            onError={() => setSrc(null)}
        />
    );
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

function mediaProgressLabel(count: number, minimum: number): string {
    const remaining = Math.max(minimum - count, 0);
    if (remaining === 0) {
        return `${count} of ${minimum}`;
    }
    return `${count} of ${minimum} — add ${remaining} more`;
}

function mediaLabel(item: UserMedia, index: number, total: number): string {
    const source = item.media_type === 'youtube' ? 'YouTube' : item.media_type === 'vimeo' ? 'Vimeo' : 'Uploaded';
    const place = index === 0 ? 'cover' : `${index + 1} of ${total}`;
    return `${source} video, ${place}`;
}

function cardAt(x: number, y: number, ignoreId: string): string | null {
    const hit = document.elementsFromPoint(x, y)
        .map((element) => element.closest('[data-media-id]'))
        .find((element) => element?.getAttribute('data-media-id') !== ignoreId);
    return hit?.getAttribute('data-media-id') ?? null;
}

function sameOrder(items: UserMedia[], ids: string[]): boolean {
    return items.length === ids.length && items.every((item, index) => item.id === ids[index]);
}

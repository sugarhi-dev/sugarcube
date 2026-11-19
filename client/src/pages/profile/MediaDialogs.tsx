import { LinkOutlined, PictureOutlined } from '@ant-design/icons';
import { Input, Modal, Progress, Typography } from 'antd';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { copyThat } from '../../theme.ts';
import { fileDragKind, fileDropHandlers, isFileDrag } from '../onboarding/fileDrop.ts';

export function LinkMediaDialog({
    open,
    busy,
    link,
    linkError,
    thumbPreview,
    thumbError,
    onLinkChange,
    onClearLinkError,
    onAdd,
    onClose,
    onChooseThumb,
}: {
    open: boolean;
    busy: boolean;
    link: string;
    linkError: string | null;
    thumbPreview: string | null;
    thumbError: string | null;
    onLinkChange: (value: string) => void;
    onClearLinkError: () => void;
    onAdd: () => void;
    onClose: () => void;
    onChooseThumb: (file: File) => void;
}) {
    const thumbRef = useRef<HTMLInputElement>(null);
    const [thumbOver, setThumbOver] = useState(false);

    useEffect(() => {
        if (!open) {
            setThumbOver(false);
        }
    }, [open]);

    function onThumbDragOver(event: DragEvent<HTMLDivElement>): void {
        if (!isFileDrag(event.dataTransfer)) {
            return;
        }
        event.preventDefault();
        if (busy) {
            event.dataTransfer.dropEffect = 'none';
            return;
        }
        event.dataTransfer.dropEffect = 'copy';
        if (event.target === event.currentTarget && fileDragKind(event.dataTransfer) === 'image') {
            setThumbOver(true);
        }
    }

    function onThumbDrop(event: DragEvent<HTMLDivElement>): void {
        const file = event.dataTransfer.files[0];
        if (!file && !isFileDrag(event.dataTransfer)) {
            return;
        }
        event.preventDefault();
        setThumbOver(false);
        if (busy || !file) {
            return;
        }
        onChooseThumb(file);
    }

    function leaveDrop(event: DragEvent<HTMLDivElement>): void {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) {
            return;
        }
        setThumbOver(false);
    }

    return (
        <Modal
            title="Add a YouTube or Vimeo video"
            open={open}
            okText="Add"
            cancelText="Cancel"
            confirmLoading={busy}
            destroyOnHidden
            width={480}
            onOk={onAdd}
            onCancel={() => {
                if (!busy) {
                    onClose();
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
                    onLinkChange(event.target.value);
                    if (linkError) {
                        onClearLinkError();
                    }
                }}
                onPressEnter={onAdd}
            />
            {linkError ? (
                <Typography.Text type="danger" role="alert" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
                    {linkError}
                </Typography.Text>
            ) : null}
            <div onDragOver={onThumbDragOver} onDrop={onThumbDrop} onDragLeave={leaveDrop}>
                <button
                    type="button"
                    className={thumbOver ? 'media-thumb-pick is-dropping' : 'media-thumb-pick'}
                    onClick={() => thumbRef.current?.click()}
                    {...fileDropHandlers(() => setThumbOver(true), () => setThumbOver(false), (file) => {
                        onChooseThumb(file);
                    })}
                >
                    {thumbPreview ? (
                        <img src={thumbPreview} alt="Selected thumbnail" draggable={false} />
                    ) : (
                        <span><PictureOutlined /> Drop a thumbnail</span>
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
                            onChooseThumb(file);
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
            </div>
        </Modal>
    );
}

export function UploadMediaDialog({
    open,
    uploading,
    uploadPercent,
    videoName,
    videoError,
    thumbPreview,
    canUpload,
    onChooseVideo,
    onChooseThumb,
    onDropFile,
    onUpload,
    onCancel,
}: {
    open: boolean;
    uploading: boolean;
    uploadPercent: number;
    videoName: string | null;
    videoError: string | null;
    thumbPreview: string | null;
    canUpload: boolean;
    onChooseVideo: (file: File) => void;
    onChooseThumb: (file: File) => void;
    onDropFile: (file: File) => void;
    onUpload: () => void;
    onCancel: () => void;
}) {
    const videoRef = useRef<HTMLInputElement>(null);
    const thumbRef = useRef<HTMLInputElement>(null);
    const [videoOver, setVideoOver] = useState(false);
    const [thumbOver, setThumbOver] = useState(false);

    useEffect(() => {
        if (!open) {
            setVideoOver(false);
            setThumbOver(false);
        }
    }, [open]);

    function onUploadDragOver(event: DragEvent<HTMLDivElement>): void {
        if (!isFileDrag(event.dataTransfer)) {
            return;
        }
        event.preventDefault();
        if (uploading) {
            event.dataTransfer.dropEffect = 'none';
            return;
        }
        event.dataTransfer.dropEffect = 'copy';
        if (event.target !== event.currentTarget) {
            return;
        }
        const kind = fileDragKind(event.dataTransfer);
        if (kind === 'image') {
            setThumbOver(true);
            setVideoOver(false);
        } else if (kind === 'video') {
            setVideoOver(true);
            setThumbOver(false);
        }
    }

    function onUploadDrop(event: DragEvent<HTMLDivElement>): void {
        const file = event.dataTransfer.files[0];
        if (!file && !isFileDrag(event.dataTransfer)) {
            return;
        }
        event.preventDefault();
        setVideoOver(false);
        setThumbOver(false);
        if (uploading || !file) {
            return;
        }
        onDropFile(file);
    }

    function leaveDrop(event: DragEvent<HTMLDivElement>): void {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) {
            return;
        }
        setVideoOver(false);
        setThumbOver(false);
    }

    return (
        <Modal
            title="Upload a video"
            open={open}
            okText="Upload"
            cancelText="Cancel"
            confirmLoading={uploading}
            okButtonProps={{ disabled: !canUpload }}
            destroyOnHidden
            width={440}
            onOk={onUpload}
            onCancel={onCancel}
        >
            <div onDragOver={onUploadDragOver} onDrop={onUploadDrop} onDragLeave={leaveDrop}>
                <button
                    type="button"
                    className={videoOver ? 'media-upload-note is-dropping' : 'media-upload-note'}
                    onClick={() => videoRef.current?.click()}
                    disabled={uploading}
                    {...fileDropHandlers(() => {
                        setVideoOver(true);
                        setThumbOver(false);
                    }, () => setVideoOver(false), onChooseVideo)}
                >
                    {videoName ?? 'Drop an MP4, MOV, or WebM'}
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
                            onChooseVideo(file);
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
                <button
                    type="button"
                    className={thumbOver ? 'media-thumb-pick is-dropping' : 'media-thumb-pick'}
                    onClick={() => thumbRef.current?.click()}
                    disabled={uploading}
                    {...fileDropHandlers(() => {
                        setThumbOver(true);
                        setVideoOver(false);
                    }, () => setThumbOver(false), onChooseThumb)}
                >
                    {thumbPreview ? (
                        <img src={thumbPreview} alt="Selected thumbnail" draggable={false} />
                    ) : (
                        <span><PictureOutlined /> Drop a thumbnail</span>
                    )}
                </button>
                <input
                    ref={thumbRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    hidden
                    aria-label="Upload thumbnail"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) {
                            onChooseThumb(file);
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
            </div>
        </Modal>
    );
}

export function PhotoMediaDialog({
    open,
    uploading,
    uploadPercent,
    photoPreview,
    photoError,
    canUpload,
    onChoosePhoto,
    onUpload,
    onCancel,
}: {
    open: boolean;
    uploading: boolean;
    uploadPercent: number;
    photoPreview: string | null;
    photoError: string | null;
    canUpload: boolean;
    onChoosePhoto: (file: File) => void;
    onUpload: () => void;
    onCancel: () => void;
}) {
    const photoRef = useRef<HTMLInputElement>(null);
    const [photoOver, setPhotoOver] = useState(false);

    useEffect(() => {
        if (!open) {
            setPhotoOver(false);
        }
    }, [open]);

    return (
        <Modal
            title="Upload a photo"
            open={open}
            okText="Upload"
            cancelText="Cancel"
            confirmLoading={uploading}
            okButtonProps={{ disabled: !canUpload }}
            destroyOnHidden
            width={440}
            onOk={onUpload}
            onCancel={onCancel}
        >
            <button
                type="button"
                className={photoOver ? 'media-thumb-pick is-primary is-dropping' : 'media-thumb-pick is-primary'}
                onClick={() => photoRef.current?.click()}
                disabled={uploading}
                {...fileDropHandlers(() => setPhotoOver(true), () => setPhotoOver(false), onChoosePhoto)}
            >
                {photoPreview ? (
                    <img src={photoPreview} alt="Selected photo" draggable={false} />
                ) : (
                    <span><PictureOutlined /> Drop a JPG or PNG</span>
                )}
            </button>
            <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png"
                hidden
                aria-label="Photo"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) {
                        onChoosePhoto(file);
                    }
                }}
            />
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                JPG or PNG · up to 8 MB.
            </Typography.Text>
            {photoError ? (
                <Typography.Text type="danger" role="alert" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
                    {photoError}
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
    );
}

export function EditMediaDialog({
    open,
    saving,
    url,
    error,
    onUrlChange,
    onClearError,
    onSave,
    onClose,
}: {
    open: boolean;
    saving: boolean;
    url: string;
    error: string | null;
    onUrlChange: (value: string) => void;
    onClearError: () => void;
    onSave: () => void;
    onClose: () => void;
}) {
    return (
        <Modal
            title="Edit video link"
            open={open}
            okText="Save"
            cancelText="Cancel"
            confirmLoading={saving}
            destroyOnHidden
            width={440}
            onOk={onSave}
            onCancel={() => {
                if (!saving) {
                    onClose();
                }
            }}
        >
            <Input
                autoFocus
                className="media-link"
                prefix={<LinkOutlined />}
                placeholder="Paste a Vimeo or YouTube link..."
                aria-label="Replacement link"
                value={url}
                status={error ? 'error' : undefined}
                onChange={(event) => {
                    onUrlChange(event.target.value);
                    if (error) {
                        onClearError();
                    }
                }}
            />
            {error ? (
                <Typography.Text type="danger" role="alert" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
                    {error}
                </Typography.Text>
            ) : null}
        </Modal>
    );
}

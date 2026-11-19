import { classifyMediaLink, mediaUrl, type UserMedia } from '@sugarcube/schema';
import { App as AntdApp } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { createMedia, deleteMedia, updateMedia, uploadMedia, uploadPhoto } from '../../api/media.ts';
import { imageFile, useKeepFileDrop } from '../onboarding/fileDrop.ts';
import { EditMediaDialog, LinkMediaDialog, PhotoMediaDialog, UploadMediaDialog } from './MediaDialogs.tsx';
import { MediaGallery } from './MediaGallery.tsx';

const thumbnailLimit = 8 * 1024 * 1024;
const photoLimit = 8 * 1024 * 1024;
const videoLimit = 200 * 1024 * 1024;

export function ProfileMedia({
    readOnly,
    media,
    accessToken,
    mediaRef,
    writes,
    onMedia,
    onReload,
}: {
    readOnly: boolean;
    media: UserMedia[];
    accessToken: string;
    mediaRef: { current: UserMedia[] };
    writes: { current: Promise<void> };
    onMedia: (next: UserMedia[]) => void;
    onReload: () => void;
}) {
    const { message } = AntdApp.useApp();
    const [linkOpen, setLinkOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [photoOpen, setPhotoOpen] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);
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
    const uploadAbort = useRef<AbortController | null>(null);

    useKeepFileDrop(uploadOpen || linkOpen || photoOpen);

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

    useEffect(() => {
        if (!photoFile) {
            setPhotoPreview(null);
            return;
        }
        const url = URL.createObjectURL(photoFile);
        setPhotoPreview(url);
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [photoFile]);

    function enqueue(task: () => Promise<void>): void {
        writes.current = writes.current.then(task, task).catch((error: unknown) => {
            message.error(error instanceof Error ? error.message : 'Could not save your media.');
            onReload();
        });
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

    function openPhotoDialog(): void {
        if (uploading) {
            return;
        }
        setPhotoFile(null);
        setPhotoError(null);
        setUploadPercent(0);
        setPhotoOpen(true);
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
        const image = imageFile(file);
        if (!image) {
            setThumbError('Use a JPG or PNG thumbnail.');
            return;
        }
        if (image.size > thumbnailLimit) {
            setThumbError('Use a thumbnail smaller than 8 MB.');
            return;
        }
        try {
            const bitmap = await createImageBitmap(image);
            bitmap.close();
        } catch {
            setThumbError('Could not read that thumbnail.');
            return;
        }
        setThumbError(null);
        setThumbFile(image);
    }

    function takeDropped(file: File): void {
        if (videoContentType(file)) {
            chooseVideo(file);
            return;
        }
        if (imageFile(file)) {
            void chooseThumbnail(file);
            return;
        }
        setVideoError('Use an MP4, MOV, or WebM video.');
    }

    async function onAddLink(): Promise<void> {
        if (addingMedia) {
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
            const created = await createMedia(accessToken, parsed.url, thumbFile);
            onMedia([...mediaRef.current, created]);
            setLinkOpen(false);
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : 'Could not add that video.');
        } finally {
            setAddingMedia(false);
        }
    }

    async function onUpload(): Promise<void> {
        if (uploading || !videoFile || !videoType) {
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
                accessToken,
                videoFile,
                videoType,
                thumbFile,
                setUploadPercent,
                controller.signal,
            );
            onMedia([...mediaRef.current, created]);
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

    async function choosePhoto(file: File): Promise<void> {
        const image = imageFile(file);
        if (!image) {
            setPhotoFile(null);
            setPhotoError('Use a JPG or PNG photo.');
            return;
        }
        if (image.size > photoLimit) {
            setPhotoFile(null);
            setPhotoError('Use a photo smaller than 8 MB.');
            return;
        }
        try {
            const bitmap = await createImageBitmap(image);
            bitmap.close();
        } catch {
            setPhotoFile(null);
            setPhotoError('Could not read that photo.');
            return;
        }
        setPhotoError(null);
        setPhotoFile(image);
    }

    async function onUploadPhoto(): Promise<void> {
        if (uploading || !photoFile) {
            return;
        }

        const controller = new AbortController();
        uploadAbort.current = controller;
        setPhotoError(null);
        setUploadPercent(0);
        setUploading(true);
        try {
            await writes.current;
            const created = await uploadPhoto(
                accessToken,
                photoFile,
                photoFile.type,
                setUploadPercent,
                controller.signal,
            );
            onMedia([...mediaRef.current, created]);
            setPhotoOpen(false);
        } catch (error: unknown) {
            if (isAbort(error)) {
                setPhotoOpen(false);
                return;
            }
            message.error(error instanceof Error ? error.message : 'Could not upload that photo.');
        } finally {
            uploadAbort.current = null;
            setUploading(false);
        }
    }

    function closePhoto(): void {
        if (uploading) {
            uploadAbort.current?.abort();
            return;
        }
        setPhotoOpen(false);
    }

    function onRemoveMedia(id: string): void {
        if (removingMediaId) {
            return;
        }
        if (editingMediaId === id) {
            setEditingMediaId(null);
        }
        onMedia(mediaRef.current.filter((item) => item.id !== id));
        setRemovingMediaId(id);
        enqueue(async () => {
            try {
                await deleteMedia(accessToken, id);
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
        if (savingMediaId) {
            return;
        }
        const parsed = classifyMediaLink(editUrl);
        if (!parsed) {
            setEditError('Paste a YouTube or Vimeo link.');
            return;
        }

        setSavingMediaId(id);
        setEditError(null);
        try {
            await writes.current;
            const saved = await updateMedia(accessToken, id, parsed.url);
            onMedia(mediaRef.current.map((item) => item.id === id ? saved : item));
            setEditingMediaId((current) => current === id ? null : current);
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : 'Could not update that video.');
        } finally {
            setSavingMediaId((current) => current === id ? null : current);
        }
    }

    return (
        <>
            <MediaGallery
                readOnly={readOnly}
                media={media}
                accessToken={accessToken}
                removingId={removingMediaId}
                onEdit={onEditMedia}
                onRemove={onRemoveMedia}
                onUpload={openUploadDialog}
                onAddPhoto={openPhotoDialog}
                onAddLink={openLinkDialog}
            />
            <LinkMediaDialog
                open={linkOpen}
                busy={addingMedia}
                link={link}
                linkError={linkError}
                thumbPreview={thumbPreview}
                thumbError={thumbError}
                onLinkChange={setLink}
                onClearLinkError={() => setLinkError(null)}
                onAdd={() => {
                    void onAddLink();
                }}
                onClose={() => setLinkOpen(false)}
                onChooseThumb={(file) => {
                    void chooseThumbnail(file);
                }}
            />
            <UploadMediaDialog
                open={uploadOpen}
                uploading={uploading}
                uploadPercent={uploadPercent}
                videoName={videoFile?.name ?? null}
                videoError={videoError}
                thumbPreview={thumbPreview}
                canUpload={Boolean(videoFile && thumbFile)}
                onChooseVideo={chooseVideo}
                onChooseThumb={(file) => {
                    void chooseThumbnail(file);
                }}
                onDropFile={takeDropped}
                onUpload={() => {
                    void onUpload();
                }}
                onCancel={closeUpload}
            />
            <PhotoMediaDialog
                open={photoOpen}
                uploading={uploading}
                uploadPercent={uploadPercent}
                photoPreview={photoPreview}
                photoError={photoError}
                canUpload={Boolean(photoFile)}
                onChoosePhoto={(file) => {
                    void choosePhoto(file);
                }}
                onUpload={() => {
                    void onUploadPhoto();
                }}
                onCancel={closePhoto}
            />
            <EditMediaDialog
                open={editingMediaId !== null}
                saving={savingMediaId !== null}
                url={editUrl}
                error={editError}
                onUrlChange={setEditUrl}
                onClearError={() => setEditError(null)}
                onSave={() => {
                    if (editingMediaId) {
                        void onSaveMedia(editingMediaId);
                    }
                }}
                onClose={() => setEditingMediaId(null)}
            />
        </>
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

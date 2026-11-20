import { AppstoreOutlined, CaretRightFilled, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { mediaUrl, type UserMedia } from '@sugarcube/schema';
import { App as AntdApp } from 'antd';
import { useEffect, useState } from 'react';
import { MediaMark } from '../../components/MediaMark.tsx';
import { embedSrc, withAutoplay } from './mediaEmbed.ts';

export function MediaTile({
    item,
    index,
    total,
    readOnly,
    removing,
    onOpenPhoto,
    onEdit,
    onRemove,
    showAll = false,
    onShowAll,
}: {
    item: UserMedia;
    index: number;
    total: number;
    readOnly: boolean;
    removing: boolean;
    onOpenPhoto: () => void;
    onEdit: () => void;
    onRemove: () => void;
    showAll?: boolean;
    onShowAll?: () => void;
}) {
    const { message } = AntdApp.useApp();
    const label = mediaLabel(item, index, total);
    const embed = embedSrc(item);
    const photo = item.media_type === 'photo';
    return (
        <div className={index === 0 ? 'crew-tile crew-tile-hero' : 'crew-tile'}>
            {embed ? (
                <MediaEmbed
                    src={embed}
                    imageUrl={item.image_url}
                    label={label}
                    status={item.status}
                    hideMark={showAll}
                />
            ) : photo ? (
                <button
                    type="button"
                    className="crew-tile-open"
                    aria-label="View photo"
                    onClick={onOpenPhoto}
                >
                    <MediaThumb src={item.image_url} fallback="Photo" />
                    {showAll ? null : <MediaMark media={item} />}
                </button>
            ) : (
                <button
                    type="button"
                    className="crew-tile-open"
                    aria-label={index === 0 ? 'Play video' : 'Open video'}
                    onClick={() => openMedia(item, message)}
                >
                    <MediaThumb src={item.image_url} />
                    {showAll ? null : <MediaMark media={item} />}
                    {index === 0 ? (
                        <span className="crew-play" aria-hidden="true">
                            <CaretRightFilled />
                        </span>
                    ) : null}
                </button>
            )}
            {index === 0 ? <span className="crew-cover">Cover · autoplays</span> : null}
            {showAll ? (
                <button type="button" className="crew-show-all" onClick={onShowAll}>
                    <AppstoreOutlined aria-hidden />
                    Show all media
                </button>
            ) : null}
            {readOnly ? null : (
                <div className="crew-tile-tools">
                    {photo ? null : (
                        <button
                            type="button"
                            className="crew-tile-tool"
                            aria-label={`Edit ${label}`}
                            onClick={onEdit}
                        >
                            <EditOutlined />
                        </button>
                    )}
                    <button
                        type="button"
                        className="crew-tile-tool"
                        aria-label={`Delete ${label}`}
                        disabled={removing}
                        onClick={onRemove}
                    >
                        <DeleteOutlined />
                    </button>
                </div>
            )}
        </div>
    );
}

function MediaEmbed({
    src,
    imageUrl,
    label,
    status,
    hideMark,
}: {
    src: string;
    imageUrl: string | null;
    label: string;
    status: UserMedia['status'];
    hideMark: boolean;
}) {
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        setPlaying(false);
    }, [src]);

    if (!playing) {
        return (
            <button type="button" className="crew-tile-open" aria-label={`Play ${label}`} onClick={() => setPlaying(true)}>
                <MediaThumb src={imageUrl} />
                {hideMark ? null : <MediaMark media={{ media_type: 'youtube', status }} />}
                <span className="crew-play" aria-hidden="true">
                    <CaretRightFilled />
                </span>
            </button>
        );
    }

    return (
        <iframe
            className="crew-tile-frame"
            src={withAutoplay(src)}
            title={label}
            allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
        />
    );
}

function MediaThumb({ src, fallback = 'Video' }: { src: string | null; fallback?: string }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [src]);

    if (!src || failed) {
        return <span className="crew-tile-fallback">{fallback}</span>;
    }

    return (
        <img
            src={src}
            alt=""
            ref={(node) => {
                if (node?.complete) {
                    applyMediaAspect(node);
                }
            }}
            onLoad={(event) => applyMediaAspect(event.currentTarget)}
            onError={() => setFailed(true)}
        />
    );
}

function applyMediaAspect(image: HTMLImageElement): void {
    const tile = image.closest('.crew-tile');
    if (!(tile instanceof HTMLElement) || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        return;
    }
    tile.style.setProperty('--media-aspect', `${image.naturalWidth} / ${image.naturalHeight}`);
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

function mediaLabel(item: UserMedia, index: number, total: number): string {
    const source = item.media_type === 'youtube'
        ? 'YouTube video'
        : item.media_type === 'vimeo'
            ? 'Vimeo video'
            : item.media_type === 'photo'
                ? 'Photo'
                : 'Uploaded video';
    const place = index === 0 ? 'cover' : `${index + 1} of ${total}`;
    return `${source}, ${place}`;
}

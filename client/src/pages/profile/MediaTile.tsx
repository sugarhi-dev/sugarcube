import { CaretRightFilled, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { classifyMediaLink, mediaUrl, type UserMedia } from '@sugarcube/schema';
import { App as AntdApp } from 'antd';
import { useEffect, useState } from 'react';
import { getMediaThumbnail } from '../../api/media.ts';
import { MediaMark } from '../../components/MediaMark.tsx';

export function MediaTile({
    item,
    index,
    total,
    accessToken,
    readOnly,
    removing,
    onOpenPhoto,
    onEdit,
    onRemove,
}: {
    item: UserMedia;
    index: number;
    total: number;
    accessToken: string;
    readOnly: boolean;
    removing: boolean;
    onOpenPhoto: () => void;
    onEdit: () => void;
    onRemove: () => void;
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
                    id={item.id}
                    accessToken={accessToken}
                    label={label}
                    status={item.status}
                />
            ) : photo ? (
                <button
                    type="button"
                    className="crew-tile-open"
                    aria-label="View photo"
                    onClick={onOpenPhoto}
                >
                    <MediaThumb id={item.id} accessToken={accessToken} fallback="Photo" />
                    <MediaMark media={item} />
                </button>
            ) : (
                <button
                    type="button"
                    className="crew-tile-open"
                    aria-label={index === 0 ? 'Play video' : 'Open video'}
                    onClick={() => openMedia(item, message)}
                >
                    <MediaThumb id={item.id} accessToken={accessToken} />
                    <MediaMark media={item} />
                    {index === 0 ? (
                        <span className="crew-play" aria-hidden="true">
                            <CaretRightFilled />
                        </span>
                    ) : null}
                </button>
            )}
            {index === 0 ? <span className="crew-cover">Cover · autoplays</span> : null}
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
    id,
    accessToken,
    label,
    status,
}: {
    src: string;
    id: string;
    accessToken: string;
    label: string;
    status: UserMedia['status'];
}) {
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        setPlaying(false);
    }, [src]);

    if (!playing) {
        return (
            <button type="button" className="crew-tile-open" aria-label={`Play ${label}`} onClick={() => setPlaying(true)}>
                <MediaThumb id={id} accessToken={accessToken} />
                <MediaMark media={{ media_type: 'youtube', status }} />
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

function MediaThumb({ id, accessToken, fallback = 'Video' }: { id: string; accessToken: string; fallback?: string }) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        let url: string | null = null;
        setSrc(null);
        void getMediaThumbnail(accessToken, id).then((blob) => {
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
    }, [accessToken, id]);

    if (!src) {
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

function withAutoplay(src: string): string {
    const url = new URL(src);
    url.searchParams.set('autoplay', '1');
    return url.toString();
}

function embedSrc(item: UserMedia): string | null {
    if (item.media_type === 'upload' || item.media_type === 'photo') {
        return null;
    }
    const link = classifyMediaLink(item.ref);
    if (!link) {
        return null;
    }
    if (link.media_type === 'youtube') {
        return `https://www.youtube.com/embed/${link.videoId}`;
    }
    return `https://player.vimeo.com/video/${link.videoId}`;
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

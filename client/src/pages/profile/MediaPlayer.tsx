import {
    CaretRightFilled,
    CloseOutlined,
    LeftOutlined,
    RightOutlined,
    ShareAltOutlined,
} from '@ant-design/icons';
import type { UserMedia } from '@sugarcube/schema';
import { App as AntdApp } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { embedSrc, isStill, mediaKind, withAutoplay } from './mediaEmbed.ts';

type MediaFilter = 'all' | 'videos' | 'stills';

export function MediaPlayer({
    media,
    mediaId,
    name,
    role,
    captionTitle,
    captionDetail,
    onClose,
    onSelect,
}: {
    media: UserMedia[];
    mediaId: string;
    name: string;
    role: string;
    captionTitle: string | null;
    captionDetail: string | null;
    onClose: () => void;
    onSelect: (id: string) => void;
}) {
    const { message } = AntdApp.useApp();
    const [filter, setFilter] = useState<MediaFilter>('all');
    const videos = useMemo(() => media.filter((item) => !isStill(item)), [media]);
    const stills = useMemo(() => media.filter(isStill), [media]);
    const items = filter === 'videos' ? videos : filter === 'stills' ? stills : media;
    const matched = items.findIndex((item) => item.id === mediaId);
    const index = matched >= 0 ? matched : 0;
    const current = items[index] ?? null;

    useEffect(() => {
        if (!current || current.id === mediaId) {
            return;
        }
        onSelect(current.id);
    }, [current, mediaId, onSelect]);

    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    useEffect(() => {
        function onKey(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                onClose();
                return;
            }
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                return;
            }
            const target = event.target;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                return;
            }
            const next = event.key === 'ArrowRight' ? index + 1 : index - 1;
            const item = items[next];
            if (!item) {
                return;
            }
            event.preventDefault();
            onSelect(item.id);
        }

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [index, items, onClose, onSelect]);

    useEffect(() => {
        document.getElementById(`player-thumb-${mediaId}`)?.scrollIntoView({
            inline: 'center',
            block: 'nearest',
        });
    }, [mediaId]);

    async function onShare(): Promise<void> {
        try {
            await navigator.clipboard.writeText(window.location.href);
            message.success('Media link copied.');
        } catch {
            message.error('Could not copy the media link.');
        }
    }

    function chooseFilter(next: MediaFilter): void {
        setFilter(next);
    }

    const previous = index > 0 ? items[index - 1] ?? null : null;
    const next = index >= 0 ? items[index + 1] ?? null : null;

    return (
        <div className="media-player">
            <header className="media-player-bar">
                <div className="media-player-who">
                    <h1>{name}</h1>
                    <p>{role ? `${role} · Media` : 'Media'}</p>
                </div>
                <div className="media-player-filters" role="tablist" aria-label="Media type">
                    <FilterChip
                        label="All"
                        count={media.length}
                        current={filter === 'all'}
                        onClick={() => chooseFilter('all')}
                    />
                    <FilterChip
                        label="Videos"
                        count={videos.length}
                        current={filter === 'videos'}
                        onClick={() => chooseFilter('videos')}
                    />
                    <FilterChip
                        label="Stills"
                        count={stills.length}
                        current={filter === 'stills'}
                        onClick={() => chooseFilter('stills')}
                    />
                </div>
                <div className="media-player-actions">
                    <button type="button" className="media-player-share" onClick={() => void onShare()}>
                        <ShareAltOutlined aria-hidden />
                        Share
                    </button>
                    <button type="button" className="media-player-close" aria-label="Close media" onClick={onClose}>
                        <CloseOutlined />
                    </button>
                </div>
            </header>
            <div className="media-player-stage">
                <div className="media-player-column">
                    <div className="media-player-frame-wrap">
                        <button
                            type="button"
                            className="media-player-arrow is-prev"
                            aria-label="Previous"
                            disabled={!previous}
                            onClick={() => {
                                if (previous) {
                                    onSelect(previous.id);
                                }
                            }}
                        >
                            <LeftOutlined />
                        </button>
                        <div className="media-player-frame">
                            {current ? (
                                <PlayerStage item={current} />
                            ) : (
                                <p className="media-player-empty">Nothing in this view.</p>
                            )}
                        </div>
                        <button
                            type="button"
                            className="media-player-arrow is-next"
                            aria-label="Next"
                            disabled={!next}
                            onClick={() => {
                                if (next) {
                                    onSelect(next.id);
                                }
                            }}
                        >
                            <RightOutlined />
                        </button>
                    </div>
                    {current ? (
                        <div className="media-player-caption">
                            <div>
                                <h2>{captionTitle ?? mediaKind(current)}</h2>
                                {captionDetail ? <p>{captionDetail}</p> : null}
                            </div>
                            <span>{index + 1} of {items.length}</span>
                        </div>
                    ) : null}
                </div>
            </div>
            <div className="media-player-strip">
                <div className="media-player-strip-row">
                    {items.map((item) => (
                        <button
                            key={item.id}
                            id={`player-thumb-${item.id}`}
                            type="button"
                            className={item.id === mediaId ? 'media-player-thumb is-current' : 'media-player-thumb'}
                            aria-label={mediaKind(item)}
                            aria-current={item.id === mediaId ? 'true' : undefined}
                            onClick={() => onSelect(item.id)}
                        >
                            <PlayerImage src={item.image_url} />
                            <span className="media-player-thumb-badge">
                                {isStill(item) ? 'Still' : <CaretRightFilled aria-hidden />}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function FilterChip({
    label,
    count,
    current,
    onClick,
}: {
    label: string;
    count: number;
    current: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="tab"
            className={current ? 'media-player-filter is-current' : 'media-player-filter'}
            aria-selected={current}
            onClick={onClick}
        >
            {label}
            <span>{count}</span>
        </button>
    );
}

function PlayerStage({ item }: { item: UserMedia }) {
    const embed = embedSrc(item);
    if (embed) {
        return (
            <iframe
                key={item.id}
                className="media-player-embed"
                src={withAutoplay(embed)}
                title={mediaKind(item)}
                allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
            />
        );
    }
    if (item.media_type === 'photo') {
        return <PlayerImage src={item.image_url} cover />;
    }
    return (
        <div className="media-player-hold">
            <PlayerImage src={item.image_url} cover />
            <p>{item.status === 'pending' ? 'The media is being prepared.' : 'Playback for uploaded videos isn\'t available here yet.'}</p>
        </div>
    );
}

function PlayerImage({ src, cover = false }: { src: string | null; cover?: boolean }) {
    if (!src) {
        return <span className="media-player-fallback" />;
    }
    return <img src={src} alt="" className={cover ? 'is-cover' : undefined} />;
}

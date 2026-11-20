import { classifyMediaLink, type UserMedia } from '@sugarcube/schema';

export function isStill(item: UserMedia): boolean {
    return item.media_type === 'photo';
}

export function mediaKind(item: UserMedia): string {
    if (item.media_type === 'photo') {
        return 'Photo';
    }
    if (item.media_type === 'youtube') {
        return 'YouTube';
    }
    if (item.media_type === 'vimeo') {
        return 'Vimeo';
    }
    return 'Video';
}

export function embedSrc(item: UserMedia): string | null {
    if (item.media_type === 'photo') {
        return null;
    }
    if (item.media_type === 'upload') {
        return item.status === 'ready' ? item.stream_url : null;
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

export function withAutoplay(src: string): string {
    const url = new URL(src);
    url.searchParams.set('autoplay', '1');
    return url.toString();
}

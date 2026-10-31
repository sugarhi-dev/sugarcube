import { z } from 'zod';

export const MediaTypeSchema = z.enum(['youtube', 'vimeo', 'upload']);

export type MediaType = z.infer<typeof MediaTypeSchema>;

// Video the browser may keep. The owner and sort position stay on the server entity.
// ref is a YouTube or Vimeo URL, or the ULID of a self-uploaded file.
export const UserMediaSchema = z.object({
    id: z.ulid(),
    media_type: MediaTypeSchema,
    ref: z.string().min(1).max(2048),
}).strip();

export type UserMedia = z.infer<typeof UserMediaSchema>;

// YouTube and Vimeo keep the link in ref. An upload keeps a file id there.
export function mediaUrl(media: Pick<UserMedia, 'media_type' | 'ref'>): string | null {
    if (media.media_type === 'upload') {
        return null;
    }
    return classifyMediaLink(media.ref)?.url ?? null;
}

const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;
const vimeoIdPattern = /^\d{5,12}$/;

export type MediaLink = {
    media_type: 'youtube' | 'vimeo';
    url: string;
    videoId: string;
};

export function classifyMediaLink(raw: string): MediaLink | null {
    const urlText = raw.trim();
    if (!urlText || urlText.length > 2048) {
        return null;
    }

    let url: URL;
    try {
        url = new URL(urlText);
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return null;
    }

    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
        const videoId = firstSegment(url.pathname);
        return videoId && youtubeIdPattern.test(videoId)
            ? { media_type: 'youtube', url: urlText, videoId }
            : null;
    }
    if (
        host === 'youtube.com'
        || host === 'm.youtube.com'
        || host === 'music.youtube.com'
        || host === 'youtube-nocookie.com'
    ) {
        const videoId = youtubeId(url);
        return videoId ? { media_type: 'youtube', url: urlText, videoId } : null;
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
        const videoId = vimeoId(url.pathname);
        return videoId ? { media_type: 'vimeo', url: urlText, videoId } : null;
    }
    return null;
}

function youtubeId(url: URL): string | null {
    const fromQuery = url.searchParams.get('v');
    if (fromQuery && youtubeIdPattern.test(fromQuery)) {
        return fromQuery;
    }

    const parts = url.pathname.split('/').filter(Boolean);
    const markers = new Set(['embed', 'shorts', 'live', 'v']);
    for (let index = 0; index < parts.length - 1; index += 1) {
        const videoId = parts[index + 1];
        if (markers.has(parts[index] ?? '') && videoId && youtubeIdPattern.test(videoId)) {
            return videoId;
        }
    }
    return null;
}

function vimeoId(pathname: string): string | null {
    const parts = pathname.split('/').filter(Boolean);
    const marker = parts.findIndex((part) => part === 'video' || part === 'videos');
    const marked = marker >= 0 ? parts[marker + 1] : undefined;
    if (marked && vimeoIdPattern.test(marked)) {
        return marked;
    }
    return parts.find((part) => vimeoIdPattern.test(part)) ?? null;
}

function firstSegment(pathname: string): string | undefined {
    return pathname.split('/').filter(Boolean)[0];
}

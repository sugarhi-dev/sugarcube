import { UserMediaSchema, type UserMedia } from '@sugarcube/schema';
import { apiBlob, apiJson } from './http.ts';
import { parseResponse, parseResponseList } from './parse.ts';

export type { UserMedia };

export function listMedia(accessToken: string): Promise<UserMedia[]> {
    return readMediaList(accessToken, '/api/me/media');
}

export async function createMedia(accessToken: string, url: string, thumbnail: File): Promise<UserMedia> {
    const created = await readMedia(accessToken, '/api/me/media', {
        method: 'POST',
        body: JSON.stringify({ url }),
    });
    try {
        return await readMedia(accessToken, `/api/me/media/${encodeURIComponent(created.id)}/thumbnail`, {
            method: 'PUT',
            body: thumbnail,
            headers: { 'Content-Type': thumbnail.type },
        });
    } catch (error) {
        await deleteMedia(accessToken, created.id).catch(() => undefined);
        throw error;
    }
}

export function getMediaThumbnail(accessToken: string, id: string): Promise<Blob> {
    return apiBlob(accessToken, `/api/me/media/${encodeURIComponent(id)}/thumbnail`);
}

export function reorderMedia(accessToken: string, ids: string[]): Promise<UserMedia[]> {
    return readMediaList(accessToken, '/api/me/media/order', {
        method: 'PUT',
        body: JSON.stringify({ ids }),
    });
}

export function updateMedia(accessToken: string, id: string, url: string): Promise<UserMedia> {
    return readMedia(accessToken, `/api/me/media/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ url }),
    });
}

export function deleteMedia(accessToken: string, id: string): Promise<UserMedia> {
    return readMedia(accessToken, `/api/me/media/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
}

async function readMediaList(accessToken: string, path: string, init?: RequestInit): Promise<UserMedia[]> {
    const body = await apiJson(accessToken, path, init);
    return parseResponseList(UserMediaSchema, body, 'Media response was not valid.');
}

async function readMedia(accessToken: string, path: string, init?: RequestInit): Promise<UserMedia> {
    const body = await apiJson(accessToken, path, init);
    return parseResponse(UserMediaSchema, body, 'Media response was not valid.');
}

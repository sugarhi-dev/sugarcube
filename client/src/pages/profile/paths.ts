export const profilePath = '/profile';
export const profileMediaPath = '/profile/media';

export function profileMediaItemPath(id: string): string {
    return `${profileMediaPath}/${encodeURIComponent(id)}`;
}

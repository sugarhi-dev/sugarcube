import { UserAvailabilitySchema, type UserAvailability } from '@sugarcube/schema';
import { apiJson } from './http.ts';
import { parseResponseList } from './parse.ts';

export type { UserAvailability };

export async function listAvailability(accessToken: string): Promise<UserAvailability[]> {
    const body = await apiJson(accessToken, '/api/me/availability');
    return parseResponseList(UserAvailabilitySchema, body, 'Availability response was not valid.');
}

export async function saveUnavailable(accessToken: string, dates: string[]): Promise<UserAvailability[]> {
    const body = await apiJson(accessToken, '/api/me/availability', {
        method: 'PUT',
        body: JSON.stringify({ dates }),
    });
    return parseResponseList(UserAvailabilitySchema, body, 'Availability response was not valid.');
}

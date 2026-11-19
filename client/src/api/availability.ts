import {
    ProfileUnavailabilitySchema,
    UserAvailabilitySchema,
    type ProfileUnavailability,
    type UserAvailability,
} from '@sugarcube/schema';
import { apiJson } from './http.ts';
import { parseResponseList } from './parse.ts';

export type { ProfileUnavailability, UserAvailability };

export async function listProfileUnavailability(accessToken: string): Promise<ProfileUnavailability[]> {
    const body = await apiJson(accessToken, '/api/me/availability/profiles');
    return parseResponseList(ProfileUnavailabilitySchema, body, 'Availability response was not valid.');
}

export async function listAvailability(accessToken: string): Promise<UserAvailability[]> {
    const body = await apiJson(accessToken, '/api/me/availability');
    return parseResponseList(UserAvailabilitySchema, body, 'Availability response was not valid.');
}

export async function saveUnavailable(
    accessToken: string,
    dates: string[],
    workProfileId?: string,
): Promise<UserAvailability[]> {
    const body = await apiJson(accessToken, '/api/me/availability', {
        method: 'PUT',
        body: JSON.stringify(workProfileId ? { dates, work_profile_id: workProfileId } : { dates }),
    });
    return parseResponseList(UserAvailabilitySchema, body, 'Availability response was not valid.');
}

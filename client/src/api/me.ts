import {
    CurrentUserSchema,
    ProfilePhotoUrlSchema,
    UserLocaleSchema,
    UserWorkProfileSchema,
    WorkProfileSchema,
    type AccountType,
    type CurrentUser,
    type ProfilePhotoUrl,
    type UserLocale,
    type UserStatus,
    type UserWorkProfile,
    type WorkProfile,
} from '@sugarcube/schema';
import { z } from 'zod';
import { apiBlob, apiJson } from './http.ts';
import { parseResponse, parseResponseList } from './parse.ts';

export type { AccountType, CurrentUser, ProfilePhotoUrl, UserStatus };

export type UnionStatus = 'union' | 'non_union' | 'either';

export type SetupCity = {
    production_city_id: string;
    home_city: boolean;
};

export type SetupProfileInput = {
    discipline_id: string;
    position_id: string;
    day_rate: number;
    currency_id: string;
    union_status: UnionStatus;
    flat_fee: boolean;
    cities: SetupCity[];
};

export function getMe(accessToken: string, path = '/api/me'): Promise<CurrentUser> {
    return readUser(accessToken, path);
}

export type BasicProfileInput = {
    phone: string;
    bio: string;
};

export function chooseAccountType(accessToken: string, accountType: AccountType): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/account-type', {
        method: 'PUT',
        body: JSON.stringify({ account_type: accountType }),
    });
}

export function saveBasic(accessToken: string, input: BasicProfileInput): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/basic', {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

export function uploadProfilePhoto(accessToken: string, file: File): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/photo', {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
    });
}

export function getProfilePhoto(accessToken: string): Promise<Blob> {
    return apiBlob(accessToken, '/api/me/photo');
}

export function getProfilePhotoUrl(accessToken: string, path = '/api/me/photo/url'): Promise<ProfilePhotoUrl> {
    return readOne(accessToken, path, ProfilePhotoUrlSchema, 'Profile photo link was not valid.');
}

export function saveSetup(accessToken: string, input: SetupProfileInput): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/setup', {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

export type ExperienceStatsInput = {
    projects_completed: number;
    years_in_business: number;
    response_time_hours: number;
};

export function completeExperience(accessToken: string, input: ExperienceStatsInput): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/experience', {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

export function completeMedia(accessToken: string): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/media', { method: 'PUT' });
}

export type OnboardingStep = 'new' | 'basic' | 'setup' | 'experience' | 'media';

export function returnToStep(accessToken: string, status: OnboardingStep): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/back', {
        method: 'PUT',
        body: JSON.stringify({ status }),
    });
}

export function listLocales(accessToken: string, path = '/api/me/locales'): Promise<UserLocale[]> {
    return readList(accessToken, path, UserLocaleSchema, 'Cities response was not valid.');
}

export function getWorkProfile(accessToken: string, path = '/api/me/work-profile'): Promise<UserWorkProfile> {
    return readOne(accessToken, path, UserWorkProfileSchema, 'Rates response was not valid.');
}

export function listWorkProfiles(accessToken: string, path = '/api/me/work-profiles'): Promise<WorkProfile[]> {
    return readList(accessToken, path, WorkProfileSchema, 'Positions response was not valid.');
}

export function submitProfile(accessToken: string): Promise<CurrentUser> {
    return readUser(accessToken, '/api/me/review', { method: 'PUT' });
}

async function readUser(accessToken: string, path: string, init?: RequestInit): Promise<CurrentUser> {
    const body = await apiJson(accessToken, path, init);
    return parseResponse(CurrentUserSchema, body, 'Profile response was not valid.');
}

async function readOne<T extends z.ZodType>(
    accessToken: string,
    path: string,
    schema: T,
    message: string,
): Promise<z.output<T>> {
    const body = await apiJson(accessToken, path);
    return parseResponse(schema, body, message);
}

async function readList<T extends z.ZodType>(
    accessToken: string,
    path: string,
    item: T,
    message: string,
): Promise<Array<z.output<T>>> {
    const body = await apiJson(accessToken, path);
    return parseResponseList(item, body, message);
}

import { Context, Logic } from '@sugarcube/server-core';
import { ulid } from 'ulidx';
import { UserLocaleSchema, type UserLocale } from '../entities/userLocale.js';
import { UserLocaleRepo } from '../repositories/userLocaleRepo.js';
import { constraintFailure } from './pgError.js';

export type UserLocaleWrite = {
    production_city_id: string;
    home_city: boolean;
};

export type UserLocalePatch = {
    production_city_id?: string;
    home_city?: boolean;
};

const localeConstraints = {
    user_locale_user_city_key: { statusCode: 409, message: 'That city is already on the profile.' },
    user_locale_home_city_key: { statusCode: 409, message: 'A home city is already set.' },
    user_locale_production_city_id_fkey: { statusCode: 400, message: 'Production city not found.' },
    user_locale_user_profile_id_fkey: { statusCode: 404, message: 'Profile not found.' },
};

export class UserLocaleLogic extends Logic {
    private readonly userLocaleRepo: UserLocaleRepo;

    constructor(userLocaleRepo: UserLocaleRepo) {
        super();
        this.userLocaleRepo = userLocaleRepo;
    }

    listUserLocales(ctx: Context, userProfileId: string): Promise<UserLocale[]> {
        return this.userLocaleRepo.listUserLocales(ctx, userProfileId);
    }

    async getUserLocale(ctx: Context, userProfileId: string, id: string): Promise<UserLocale | null> {
        const locale = await this.userLocaleRepo.findUserLocale(ctx, userProfileId, id);
        if (!locale) {
            ctx.error('Locale not found.', 404);
            return null;
        }
        return locale;
    }

    async createUserLocale(ctx: Context, userProfileId: string, input: UserLocaleWrite): Promise<UserLocale | null> {
        const locale = UserLocaleSchema.parse({
            id: ulid(),
            user_profile_id: userProfileId,
            production_city_id: input.production_city_id,
            home_city: input.home_city,
        });
        try {
            return await this.userLocaleRepo.createUserLocale(ctx, locale);
        } catch (error) {
            return this.rejectConstraint(ctx, error);
        }
    }

    async updateUserLocale(
        ctx: Context,
        userProfileId: string,
        id: string,
        input: UserLocalePatch,
    ): Promise<UserLocale | null> {
        const existing = await this.userLocaleRepo.findUserLocale(ctx, userProfileId, id);
        if (!existing) {
            ctx.error('Locale not found.', 404);
            return null;
        }

        const locale = UserLocaleSchema.parse({
            ...existing,
            production_city_id: input.production_city_id ?? existing.production_city_id,
            home_city: input.home_city ?? existing.home_city,
        });
        try {
            const updated = await this.userLocaleRepo.updateUserLocale(ctx, locale);
            if (!updated) {
                ctx.error('Locale not found.', 404);
                return null;
            }
            return updated;
        } catch (error) {
            return this.rejectConstraint(ctx, error);
        }
    }

    async deleteUserLocale(ctx: Context, userProfileId: string, id: string): Promise<UserLocale | null> {
        const existing = await this.userLocaleRepo.findUserLocale(ctx, userProfileId, id);
        if (!existing) {
            ctx.error('Locale not found.', 404);
            return null;
        }

        const deleted = await this.userLocaleRepo.deleteUserLocale(ctx, userProfileId, id);
        if (!deleted) {
            ctx.error('Locale not found.', 404);
            return null;
        }
        return existing;
    }

    private rejectConstraint(ctx: Context, error: unknown): null {
        const failure = constraintFailure(error, localeConstraints);
        if (!failure) {
            throw error;
        }
        ctx.error(failure.message, failure.statusCode);
        return null;
    }
}

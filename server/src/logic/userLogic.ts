import { Binary, Context, Logic, type BinaryObject } from '@sugarcube/server-core';
import { ulid } from 'ulidx';
import type { AccountType, User, UserStatus } from '../entities/user.js';
import { UserLocaleSchema } from '../entities/userLocale.js';
import type { UnionStatus } from '../entities/userWorkProfile.js';
import { WorkProfileSchema, type WorkProfile } from '../entities/workProfile.js';
import { constraintFailure } from './pgError.js';
import { UserRepo, type BasicWrite } from '../repositories/userRepo.js';

const accountTypeConstraints = {
    user_profile_account_type_check: { statusCode: 400, message: 'Account type is not allowed.' },
};

const basicConstraints = {
    user_profile_status_check: { statusCode: 400, message: 'Account status is not allowed.' },
    user_profile_bio_check: { statusCode: 400, message: 'Bio must be 300 characters or fewer.' },
};

const photoConstraints = {
    user_profile_photo_check: { statusCode: 400, message: 'Profile photo is not valid.' },
};

export const profilePhotoTtlSeconds = 15 * 60;

const setupConstraints = {
    work_profile_user_profile_id_fkey: { statusCode: 404, message: 'Profile not found.' },
    work_profile_discipline_id_fkey: { statusCode: 400, message: 'Discipline not found.' },
    work_profile_position_id_fkey: { statusCode: 400, message: 'Position not found.' },
    work_profile_position_discipline_fkey: { statusCode: 400, message: 'That position is not in the selected discipline.' },
    work_profile_user_position_key: { statusCode: 409, message: 'That position is already on the profile.' },
    user_work_profile_currency_id_fkey: { statusCode: 400, message: 'Currency not found.' },
    user_work_profile_user_profile_id_fkey: { statusCode: 404, message: 'Profile not found.' },
    user_work_profile_union_status_check: { statusCode: 400, message: 'Union status is not allowed.' },
    user_work_profile_day_rate_check: { statusCode: 400, message: 'Day rate must be zero or greater.' },
    user_work_profile_rate_currency_check: {
        statusCode: 400,
        message: 'Day rate and currency must both be set or both be empty.',
    },
    user_locale_user_city_key: { statusCode: 409, message: 'That city is already on the profile.' },
    user_locale_home_city_key: { statusCode: 409, message: 'A home city is already set.' },
    user_locale_production_city_id_fkey: { statusCode: 400, message: 'Production city not found.' },
    user_locale_user_profile_id_fkey: { statusCode: 404, message: 'Profile not found.' },
    user_profile_status_check: { statusCode: 400, message: 'Account status is not allowed.' },
};

export type SetupProfileInput = {
    discipline_id: string;
    position_id: string;
    day_rate: number;
    currency_id: string;
    union_status: UnionStatus;
    flat_fee: boolean;
    cities: Array<{ production_city_id: string; home_city: boolean }>;
};

export class UserLogic extends Logic {
    private readonly userRepo: UserRepo;
    private readonly binary: Binary;

    constructor(userRepo: UserRepo, binary: Binary) {
        super();
        this.userRepo = userRepo;
        this.binary = binary;
    }

    async createUser(ctx: Context, user: User) {
        await this.userRepo.createUser(ctx, user);
    }

    async requireByKeycloakId(ctx: Context, keycloakId: string): Promise<User | null> {
        const user = await this.userRepo.findUserByKeycloakId(ctx, keycloakId);
        if (!user) {
            ctx.error('Profile not found.', 404);
            return null;
        }
        return user;
    }

    async chooseAccountType(ctx: Context, userId: string, accountType: AccountType): Promise<User | null> {
        try {
            const user = await this.userRepo.chooseAccountType(ctx, userId, accountType);
            if (!user) {
                ctx.error('Account type can only be chosen before profile setup.', 409);
                return null;
            }
            return user;
        } catch (error) {
            const failure = constraintFailure(error, accountTypeConstraints);
            if (!failure) {
                throw error;
            }
            ctx.error(failure.message, failure.statusCode);
            return null;
        }
    }

    async saveBasic(ctx: Context, userId: string, input: BasicWrite): Promise<User | null> {
        try {
            const user = await this.userRepo.saveBasic(ctx, userId, input);
            if (!user) {
                ctx.error('Profile details can only be updated while you are setting up or reviewing your profile.', 409);
                return null;
            }
            return user;
        } catch (error) {
            const failure = constraintFailure(error, basicConstraints);
            if (!failure) {
                throw error;
            }
            ctx.error(failure.message, failure.statusCode);
            return null;
        }
    }

    async savePhoto(ctx: Context, user: User, data: Uint8Array, contentType: string): Promise<User | null> {
        if (!canUpdateProfileDetails(user.status)) {
            ctx.error('Profile photo can only be updated while you are setting up or reviewing your profile.', 409);
            return null;
        }

        const id = await this.binary.store(data, contentType);
        try {
            const saved = await this.userRepo.savePhoto(ctx, user.id, id);
            if (!saved) {
                await this.discardPhoto(id);
                ctx.error('Profile photo can only be updated while you are setting up or reviewing your profile.', 409);
                return null;
            }
            if (user.photo) {
                await this.discardPhoto(user.photo);
            }
            return saved;
        } catch (error) {
            await this.discardPhoto(id);
            const failure = constraintFailure(error, photoConstraints);
            if (!failure) {
                throw error;
            }
            ctx.error(failure.message, failure.statusCode);
            return null;
        }
    }

    loadPhoto(ctx: Context, id: string): Promise<BinaryObject | null> {
        this.log.trace(`${ctx.traceId} load profile photo ${id}`);
        return this.binary.load(id);
    }

    profilePhotoUrl(ctx: Context, id: string): Promise<string | null> {
        this.log.trace(`${ctx.traceId} profile photo url ${id}`);
        return this.binary.presignGet(id, profilePhotoTtlSeconds);
    }

    async completeSetup(ctx: Context, userId: string, input: SetupProfileInput): Promise<User | null> {
        const workProfile = WorkProfileSchema.parse({
            id: ulid(),
            user_profile_id: userId,
            discipline_id: input.discipline_id,
            position_id: input.position_id,
        });
        const locales = input.cities.map((city) => UserLocaleSchema.parse({
            id: ulid(),
            user_profile_id: userId,
            production_city_id: city.production_city_id,
            home_city: city.home_city,
        }));
        try {
            const user = await this.userRepo.completeSetup(ctx, {
                workProfile,
                day_rate: roundMoney(input.day_rate),
                currency_id: input.currency_id,
                union_status: input.union_status,
                flat_fee: input.flat_fee,
                rate_id: ulid(),
                locales,
            });
            if (!user) {
                ctx.error('Profile setup can only be updated while you are setting up or reviewing your profile.', 409);
                return null;
            }
            return user;
        } catch (error) {
            const failure = constraintFailure(error, setupConstraints);
            if (!failure) {
                throw error;
            }
            ctx.error(failure.message, failure.statusCode);
            return null;
        }
    }

    async returnToStep(ctx: Context, userId: string, target: UserStatus): Promise<User | null> {
        const from = nextOnboardingStatus[target];
        if (!from) {
            ctx.error('You can only go back one step.', 409);
            return null;
        }
        const user = await this.userRepo.returnToStep(ctx, userId, target, from);
        if (!user) {
            ctx.error('You can only go back one step.', 409);
            return null;
        }
        return user;
    }

    async completeExperience(ctx: Context, userId: string): Promise<User | null> {
        const user = await this.userRepo.completeExperience(ctx, userId);
        if (!user) {
            ctx.error('Experience can only be completed while your account is in experience.', 409);
            return null;
        }
        return user;
    }

    async completeMedia(ctx: Context, userId: string): Promise<User | null> {
        const user = await this.userRepo.completeMedia(ctx, userId);
        if (!user) {
            ctx.error('Media can only be completed while your account is on the media step.', 409);
            return null;
        }
        return user;
    }

    listWorkProfiles(ctx: Context, userId: string): Promise<WorkProfile[]> {
        return this.userRepo.listWorkProfiles(ctx, userId);
    }

    async submitForReview(ctx: Context, userId: string): Promise<User | null> {
        const result = await this.userRepo.submitForReview(ctx, userId);
        if (result.status === 'incomplete') {
            ctx.error('Add at least 2 videos before submitting.', 409);
            return null;
        }
        if (result.status === 'unavailable') {
            ctx.error('Your profile can only be submitted from the media step.', 409);
            return null;
        }
        return result.user;
    }

    private async discardPhoto(id: string): Promise<void> {
        try {
            await this.binary.remove(id);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.log.error(`Could not remove binary ${id}: ${message}`);
        }
    }
}

const nextOnboardingStatus: Partial<Record<UserStatus, UserStatus>> = {
    new: 'basic',
    basic: 'setup',
    setup: 'experience',
    experience: 'media',
    media: 'review',
};

function canUpdateProfileDetails(status: User['status']): boolean {
    return status === 'basic' || status === 'media' || status === 'review';
}

function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

import { Context, Logic } from '@sugarcube/server-core';
import { ulid } from 'ulidx';
import type { AccountType, User } from '../entities/user.js';
import { UserLocaleSchema } from '../entities/userLocale.js';
import type { UnionStatus } from '../entities/userWorkProfile.js';
import { WorkProfileSchema } from '../entities/workProfile.js';
import { constraintFailure } from './pgError.js';
import { UserRepo } from '../repositories/userRepo.js';

const accountTypeConstraints = {
    user_profile_account_type_check: { statusCode: 400, message: 'Account type is not allowed.' },
};

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
    phone: string;
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

    constructor(userRepo: UserRepo) {
        super();
        this.userRepo = userRepo;
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
                ctx.error('Account type can only be chosen for a new profile.', 409);
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
                phone: input.phone,
                workProfile,
                day_rate: roundMoney(input.day_rate),
                currency_id: input.currency_id,
                union_status: input.union_status,
                flat_fee: input.flat_fee,
                rate_id: ulid(),
                locales,
            });
            if (!user) {
                ctx.error('Profile setup is only available while your account is in setup.', 409);
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

    async completeExperience(ctx: Context, userId: string): Promise<User | null> {
        const user = await this.userRepo.completeExperience(ctx, userId);
        if (!user) {
            ctx.error('Experience can only be completed while your account is in experience.', 409);
            return null;
        }
        return user;
    }
}

function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

import { Context, Logic } from '@sugarcube/server-core';
import { ulid } from 'ulidx';
import { UserWorkProfileSchema, type UnionStatus, type UserWorkProfile } from '../entities/userWorkProfile.js';
import { UserWorkProfileRepo } from '../repositories/userWorkProfileRepo.js';
import { constraintFailure } from './pgError.js';

export type UserWorkProfileWrite = {
    day_rate: number | null;
    currency_id: string | null;
    union_status: UnionStatus;
    flat_fee: boolean;
};

const workProfileConstraints = {
    user_work_profile_user_profile_id_key: { statusCode: 409, message: 'A work profile already exists.' },
    user_work_profile_currency_id_fkey: { statusCode: 400, message: 'Currency not found.' },
    user_work_profile_user_profile_id_fkey: { statusCode: 404, message: 'Profile not found.' },
    user_work_profile_union_status_check: { statusCode: 400, message: 'Union status is not allowed.' },
    user_work_profile_day_rate_check: { statusCode: 400, message: 'Day rate must be zero or greater.' },
    user_work_profile_rate_currency_check: {
        statusCode: 400,
        message: 'Day rate and currency must both be set or both be empty.',
    },
};

export class UserWorkProfileLogic extends Logic {
    private readonly userWorkProfileRepo: UserWorkProfileRepo;

    constructor(userWorkProfileRepo: UserWorkProfileRepo) {
        super();
        this.userWorkProfileRepo = userWorkProfileRepo;
    }

    async getUserWorkProfile(ctx: Context, userProfileId: string): Promise<UserWorkProfile | null> {
        const profile = await this.userWorkProfileRepo.findUserWorkProfile(ctx, userProfileId);
        if (!profile) {
            ctx.error('Work profile not found.', 404);
            return null;
        }
        return profile;
    }

    async saveUserWorkProfile(
        ctx: Context,
        userProfileId: string,
        input: UserWorkProfileWrite,
    ): Promise<{ profile: UserWorkProfile; created: boolean } | null> {
        const profile = UserWorkProfileSchema.parse({
            id: ulid(),
            user_profile_id: userProfileId,
            day_rate: input.day_rate,
            currency_id: input.currency_id,
            union_status: input.union_status,
            flat_fee: input.flat_fee,
        });
        try {
            return await this.userWorkProfileRepo.saveUserWorkProfile(ctx, profile);
        } catch (error) {
            const failure = constraintFailure(error, workProfileConstraints);
            if (!failure) {
                throw error;
            }
            ctx.error(failure.message, failure.statusCode);
            return null;
        }
    }

    async deleteUserWorkProfile(ctx: Context, userProfileId: string): Promise<UserWorkProfile | null> {
        const existing = await this.userWorkProfileRepo.findUserWorkProfile(ctx, userProfileId);
        if (!existing) {
            ctx.error('Work profile not found.', 404);
            return null;
        }

        const deleted = await this.userWorkProfileRepo.deleteUserWorkProfile(ctx, userProfileId);
        if (!deleted) {
            ctx.error('Work profile not found.', 404);
            return null;
        }
        return existing;
    }
}

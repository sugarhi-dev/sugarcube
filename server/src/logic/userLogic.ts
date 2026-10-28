import { Context, Logic } from '@sugarcube/server-core';
import { UserRepo } from '../repositories/userRepo.js';
import type { User } from '../entities/user.js';

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
}
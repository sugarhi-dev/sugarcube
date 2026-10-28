import type { Context } from '@sugarcube/server-core';
import type { Request } from 'express';
import type { User } from '../entities/user.js';
import type { UserLogic } from '../logic/userLogic.js';
import { authenticatedSubject } from './httpHelpers.js';

export async function currentUser(ctx: Context, req: Request, userLogic: UserLogic): Promise<User | null> {
    const subject = authenticatedSubject(req);
    if (!subject) {
        ctx.error('Sign-in is required.', 401);
        return null;
    }

    return userLogic.requireByKeycloakId(ctx, subject);
}

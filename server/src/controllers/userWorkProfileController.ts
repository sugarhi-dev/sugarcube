import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { UnionStatusSchema } from '../entities/userWorkProfile.js';
import { UserWorkProfileLogic } from '../logic/userWorkProfileLogic.js';
import { UserLogic } from '../logic/userLogic.js';
import { parseBody } from './httpHelpers.js';
import { currentUser } from './currentUser.js';

const SaveUserWorkProfileRequestSchema = z.object({
    day_rate: z.number().min(0).nullable().default(null).meta({ description: 'Day rate. Empty when no rate is set.' }),
    currency_id: z.ulid().nullable().default(null).meta({ description: 'Currency for the day rate. Required when day rate is set.' }),
    union_status: UnionStatusSchema.meta({ description: 'Whether the user works union, non-union, or either.' }),
    flat_fee: z.boolean().default(false).meta({ description: 'Whether the user accepts a flat fee.' }),
}).refine(
    (row) => (row.day_rate === null) === (row.currency_id === null),
    'day_rate and currency_id must both be set or both be null',
);

export const userWorkProfileRequestSchemas = {
    SaveUserWorkProfileRequest: SaveUserWorkProfileRequestSchema,
};

export class UserWorkProfileController extends Controller {
    private readonly userLogic: UserLogic;
    private readonly userWorkProfileLogic: UserWorkProfileLogic;

    constructor(app: Express, userLogic: UserLogic, userWorkProfileLogic: UserWorkProfileLogic) {
        super(app);
        this.userLogic = userLogic;
        this.userWorkProfileLogic = userWorkProfileLogic;
        this.get('/api/me/work-profile', this.GET_work_profile.bind(this));
        this.put('/api/me/work-profile', this.PUT_work_profile.bind(this));
        this.delete('/api/me/work-profile', this.DELETE_work_profile.bind(this));
    }

    protected async GET_work_profile(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const profile = await this.userWorkProfileLogic.getUserWorkProfile(ctx, user.id);
        this.checkAndRespond(ctx, res, profile);
    }

    protected async PUT_work_profile(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const body = parseBody(SaveUserWorkProfileRequestSchema, req.body);
        const saved = await this.userWorkProfileLogic.saveUserWorkProfile(ctx, user.id, body);
        this.checkAndRespond(ctx, res, saved?.profile, saved?.created ? 201 : 200);
    }

    protected async DELETE_work_profile(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const profile = await this.userWorkProfileLogic.deleteUserWorkProfile(ctx, user.id);
        this.checkAndRespond(ctx, res, profile);
    }
}

import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { UserAvailabilityLogic } from '../logic/userAvailabilityLogic.js';
import { UserLogic } from '../logic/userLogic.js';
import { currentUser } from './currentUser.js';
import { parseBody } from './httpHelpers.js';

const SaveUnavailableRequestSchema = z.object({
    dates: z.array(z.iso.date()).max(3660).meta({ description: 'Days the work profile is unavailable.' }),
});

export const userAvailabilityRequestSchemas = {
    SaveUnavailableRequest: SaveUnavailableRequestSchema,
};

export class UserAvailabilityController extends Controller {
    private readonly userLogic: UserLogic;
    private readonly userAvailabilityLogic: UserAvailabilityLogic;

    constructor(app: Express, userLogic: UserLogic, userAvailabilityLogic: UserAvailabilityLogic) {
        super(app);
        this.userLogic = userLogic;
        this.userAvailabilityLogic = userAvailabilityLogic;
        this.get('/api/me/availability', this.GET_availability.bind(this));
        this.put('/api/me/availability', this.PUT_availability.bind(this));
    }

    protected async GET_availability(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const availability = await this.userAvailabilityLogic.listUserAvailability(ctx, user.id);
        this.checkAndRespond(ctx, res, availability);
    }

    protected async PUT_availability(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const body = parseBody(SaveUnavailableRequestSchema, req.body);
        const availability = await this.userAvailabilityLogic.saveUnavailable(ctx, user.id, body.dates);
        this.checkAndRespond(ctx, res, availability);
    }
}

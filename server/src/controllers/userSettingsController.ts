import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { UserSettingNameSchema } from '../entities/userSetting.js';
import { UserLogic } from '../logic/userLogic.js';
import { UserSettingsLogic } from '../logic/userSettingsLogic.js';
import { currentUser } from './currentUser.js';
import { parseBody } from './httpHelpers.js';

const SaveUserSettingsRequestSchema = z.object({
    settings: z.array(z.object({
        name: UserSettingNameSchema.meta({ description: 'Setting name.' }),
        value: z.string().trim().min(1).max(255).meta({ description: 'Setting value.' }),
    })).max(32).meta({
        description: 'Settings stored for the signed-in user. Names omitted from the list are removed.',
    }),
}).refine(
    (body) => new Set(body.settings.map((row) => row.name)).size === body.settings.length,
    'Each setting can only be saved once.',
);

export const userSettingsRequestSchemas = {
    SaveUserSettingsRequest: SaveUserSettingsRequestSchema,
};

export class UserSettingsController extends Controller {
    private readonly userLogic: UserLogic;
    private readonly userSettingsLogic: UserSettingsLogic;

    constructor(app: Express, userLogic: UserLogic, userSettingsLogic: UserSettingsLogic) {
        super(app);
        this.userLogic = userLogic;
        this.userSettingsLogic = userSettingsLogic;
        this.get('/api/me/settings', this.GET_settings.bind(this));
        this.put('/api/me/settings', this.PUT_settings.bind(this));
    }

    protected async GET_settings(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const settings = await this.userSettingsLogic.listUserSettings(ctx, user.id);
        this.checkAndRespond(ctx, res, settings);
    }

    protected async PUT_settings(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const body = parseBody(SaveUserSettingsRequestSchema, req.body);
        const settings = await this.userSettingsLogic.saveUserSettings(ctx, user.id, body.settings);
        this.checkAndRespond(ctx, res, settings);
    }
}

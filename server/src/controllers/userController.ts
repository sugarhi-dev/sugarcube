import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import type { User } from '../entities/user.js';
import { UnionStatusSchema } from '../entities/userWorkProfile.js';
import { UserLocaleLogic } from '../logic/userLocaleLogic.js';
import { UserLogic } from '../logic/userLogic.js';
import { UserWorkProfileLogic } from '../logic/userWorkProfileLogic.js';
import { authenticatedSubject, parseBody } from './httpHelpers.js';

const UserLocaleIdSchema = z.ulid().meta({ description: 'User locale id.' });

const CreateUserLocaleRequestSchema = z.object({
    production_city_id: z.ulid().meta({ description: 'Production city the user can work in.' }),
    home_city: z.boolean().default(false).meta({ description: 'Whether this is the user home city. Only one locale per user can be home.' }),
});

const UpdateUserLocaleRequestSchema = z.object({
    production_city_id: z.ulid().optional().meta({ description: 'Replacement production city.' }),
    home_city: z.boolean().optional().meta({ description: 'Whether this locale is the user home city.' }),
}).refine(
    (row) => row.production_city_id !== undefined || row.home_city !== undefined,
    'At least one field is required.',
);

const SaveUserWorkProfileRequestSchema = z.object({
    day_rate: z.number().min(0).nullable().default(null).meta({ description: 'Day rate. Empty when no rate is set.' }),
    currency_id: z.ulid().nullable().default(null).meta({ description: 'Currency for the day rate. Required when day rate is set.' }),
    union_status: UnionStatusSchema.meta({ description: 'Whether the user works union, non-union, or either.' }),
    flat_fee: z.boolean().default(false).meta({ description: 'Whether the user accepts a flat fee.' }),
}).refine(
    (row) => (row.day_rate === null) === (row.currency_id === null),
    'day_rate and currency_id must both be set or both be null',
);

export const userRequestSchemas = {
    UserLocaleId: UserLocaleIdSchema,
    CreateUserLocaleRequest: CreateUserLocaleRequestSchema,
    UpdateUserLocaleRequest: UpdateUserLocaleRequestSchema,
    SaveUserWorkProfileRequest: SaveUserWorkProfileRequestSchema,
};

export class UserController extends Controller {
    private readonly userLogic: UserLogic;
    private readonly userLocaleLogic: UserLocaleLogic;
    private readonly userWorkProfileLogic: UserWorkProfileLogic;

    constructor(
        app: Express,
        userLogic: UserLogic,
        userLocaleLogic: UserLocaleLogic,
        userWorkProfileLogic: UserWorkProfileLogic,
    ) {
        super(app);
        this.userLogic = userLogic;
        this.userLocaleLogic = userLocaleLogic;
        this.userWorkProfileLogic = userWorkProfileLogic;
        this.get('/api/me/locales', this.GET_locales.bind(this));
        this.post('/api/me/locales', this.POST_locale.bind(this));
        this.get('/api/me/locales/:id', this.GET_locale.bind(this));
        this.patch('/api/me/locales/:id', this.PATCH_locale.bind(this));
        this.delete('/api/me/locales/:id', this.DELETE_locale.bind(this));
        this.get('/api/me/work-profile', this.GET_work_profile.bind(this));
        this.put('/api/me/work-profile', this.PUT_work_profile.bind(this));
        this.delete('/api/me/work-profile', this.DELETE_work_profile.bind(this));
    }

    protected async GET_locales(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.currentUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const locales = await this.userLocaleLogic.listUserLocales(ctx, user.id);
        this.checkAndRespond(ctx, res, locales);
    }

    protected async POST_locale(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.currentUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const body = parseBody(CreateUserLocaleRequestSchema, req.body);
        const locale = await this.userLocaleLogic.createUserLocale(ctx, user.id, body);
        this.checkAndRespond(ctx, res, locale, 201);
    }

    protected async GET_locale(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.currentUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = UserLocaleIdSchema.parse(req.params.id);
        const locale = await this.userLocaleLogic.getUserLocale(ctx, user.id, id);
        this.checkAndRespond(ctx, res, locale);
    }

    protected async PATCH_locale(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.currentUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = UserLocaleIdSchema.parse(req.params.id);
        const body = parseBody(UpdateUserLocaleRequestSchema, req.body);
        const locale = await this.userLocaleLogic.updateUserLocale(ctx, user.id, id, body);
        this.checkAndRespond(ctx, res, locale);
    }

    protected async DELETE_locale(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.currentUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = UserLocaleIdSchema.parse(req.params.id);
        const locale = await this.userLocaleLogic.deleteUserLocale(ctx, user.id, id);
        this.checkAndRespond(ctx, res, locale);
    }

    protected async GET_work_profile(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.currentUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const profile = await this.userWorkProfileLogic.getUserWorkProfile(ctx, user.id);
        this.checkAndRespond(ctx, res, profile);
    }

    protected async PUT_work_profile(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.currentUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const body = parseBody(SaveUserWorkProfileRequestSchema, req.body);
        const saved = await this.userWorkProfileLogic.saveUserWorkProfile(ctx, user.id, body);
        this.checkAndRespond(ctx, res, saved?.profile, saved?.created ? 201 : 200);
    }

    protected async DELETE_work_profile(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.currentUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const profile = await this.userWorkProfileLogic.deleteUserWorkProfile(ctx, user.id);
        this.checkAndRespond(ctx, res, profile);
    }

    private async currentUser(ctx: Context, req: Request): Promise<User | null> {
        const subject = authenticatedSubject(req);
        if (!subject) {
            ctx.error('Sign-in is required.', 401);
            return null;
        }

        return this.userLogic.requireByKeycloakId(ctx, subject);
    }
}

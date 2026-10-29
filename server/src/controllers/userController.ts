import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { AccountTypeSchema, type User } from '../entities/user.js';
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

const ChooseAccountTypeRequestSchema = z.object({
    account_type: AccountTypeSchema.meta({ description: 'Whether the user is hiring crew or getting booked.' }),
});

const SetupCitySchema = z.object({
    production_city_id: z.ulid().meta({ description: 'Production city the user can work in.' }),
    home_city: z.boolean().meta({ description: 'Whether this city is the user home city.' }),
});

const SetupProfileRequestSchema = z.object({
    phone: z.string().trim().min(1).max(40).meta({ description: 'Phone number clients and productions can use.' }),
    discipline_id: z.ulid().meta({ description: 'Discipline the user works in.' }),
    position_id: z.ulid().meta({ description: 'Position the user is booked as.' }),
    day_rate: z.number().finite().min(0).meta({ description: 'Day rate clients see when booking.' }),
    currency_id: z.ulid().meta({ description: 'Currency for the day rate.' }),
    union_status: UnionStatusSchema.meta({ description: 'Whether the user works union, non-union, or either.' }),
    flat_fee: z.boolean().meta({ description: 'Whether the user accepts a flat fee.' }),
    cities: z.array(SetupCitySchema).min(1).max(20).meta({ description: 'Cities where the user works as a local. Exactly one is home.' }),
}).refine(
    (row) => isPhone(row.phone),
    'Enter a phone number with at least 7 digits.',
).refine(
    (row) => new Set(row.cities.map((city) => city.production_city_id)).size === row.cities.length,
    'Each city can only be added once.',
).refine(
    (row) => row.cities.filter((city) => city.home_city).length === 1,
    'Choose one home city.',
);

function isPhone(phone: string): boolean {
    return /^[0-9+().\-\s]+$/.test(phone) && (phone.match(/\d/g)?.length ?? 0) >= 7;
}

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
    ChooseAccountTypeRequest: ChooseAccountTypeRequestSchema,
    SetupProfileRequest: SetupProfileRequestSchema,
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
        this.get('/api/me', this.GET_me.bind(this));
        this.put('/api/me/account-type', this.PUT_account_type.bind(this));
        this.put('/api/me/setup', this.PUT_setup.bind(this));
        this.put('/api/me/experience', this.PUT_experience.bind(this));
        this.get('/api/me/locales', this.GET_locales.bind(this));
        this.post('/api/me/locales', this.POST_locale.bind(this));
        this.get('/api/me/locales/:id', this.GET_locale.bind(this));
        this.patch('/api/me/locales/:id', this.PATCH_locale.bind(this));
        this.delete('/api/me/locales/:id', this.DELETE_locale.bind(this));
        this.get('/api/me/work-profile', this.GET_work_profile.bind(this));
        this.put('/api/me/work-profile', this.PUT_work_profile.bind(this));
        this.delete('/api/me/work-profile', this.DELETE_work_profile.bind(this));
    }

    protected async GET_me(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.currentUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        this.checkAndRespond(ctx, res, user);
    }

    protected async PUT_account_type(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.currentUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const body = parseBody(ChooseAccountTypeRequestSchema, req.body);
        const updated = await this.userLogic.chooseAccountType(ctx, user.id, body.account_type);
        this.checkAndRespond(ctx, res, updated);
    }

    protected async PUT_setup(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.currentUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const body = parseBody(SetupProfileRequestSchema, req.body);
        const updated = await this.userLogic.completeSetup(ctx, user.id, body);
        this.checkAndRespond(ctx, res, updated);
    }

    protected async PUT_experience(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.currentUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const updated = await this.userLogic.completeExperience(ctx, user.id);
        this.checkAndRespond(ctx, res, updated);
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

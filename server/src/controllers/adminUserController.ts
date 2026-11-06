import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import type { AdminUser, User } from '../entities/user.js';
import type { Approval, DirectoryUser } from '../repositories/userRepo.js';
import { ProjectLogic } from '../logic/projectLogic.js';
import { ProjectProjectTypeLogic } from '../logic/projectProjectTypeLogic.js';
import { UserAvailabilityLogic } from '../logic/userAvailabilityLogic.js';
import { UserLocaleLogic } from '../logic/userLocaleLogic.js';
import { profilePhotoTtlSeconds, UserLogic } from '../logic/userLogic.js';
import { UserMediaLogic } from '../logic/userMediaLogic.js';
import { UserWorkProfileLogic } from '../logic/userWorkProfileLogic.js';
import { isAdminClient, parseBody } from './httpHelpers.js';

const UserIdSchema = z.ulid();
const RequestChangesSchema = z.object({
    message: z.string().trim().min(1, 'Write the email before sending.').max(5000, 'Email must be 5000 characters or fewer.'),
});
const MediaIdSchema = z.ulid();
const ProjectIdSchema = z.ulid();

export class AdminUserController extends Controller {
    private readonly userLogic: UserLogic;
    private readonly userLocaleLogic: UserLocaleLogic;
    private readonly userMediaLogic: UserMediaLogic;
    private readonly userWorkProfileLogic: UserWorkProfileLogic;
    private readonly userAvailabilityLogic: UserAvailabilityLogic;
    private readonly projectLogic: ProjectLogic;
    private readonly projectProjectTypeLogic: ProjectProjectTypeLogic;

    constructor(
        app: Express,
        userLogic: UserLogic,
        userLocaleLogic: UserLocaleLogic,
        userMediaLogic: UserMediaLogic,
        userWorkProfileLogic: UserWorkProfileLogic,
        userAvailabilityLogic: UserAvailabilityLogic,
        projectLogic: ProjectLogic,
        projectProjectTypeLogic: ProjectProjectTypeLogic,
    ) {
        super(app);
        this.userLogic = userLogic;
        this.userLocaleLogic = userLocaleLogic;
        this.userMediaLogic = userMediaLogic;
        this.userWorkProfileLogic = userWorkProfileLogic;
        this.userAvailabilityLogic = userAvailabilityLogic;
        this.projectLogic = projectLogic;
        this.projectProjectTypeLogic = projectProjectTypeLogic;
        this.get('/api/admin/users', this.GET_users.bind(this));
        this.get('/api/admin/approvals', this.GET_approvals.bind(this));
        this.get('/api/admin/users/:id', this.GET_user.bind(this));
        this.post('/api/admin/users/:id/approve', this.POST_approve.bind(this));
        this.post('/api/admin/users/:id/back-to-review', this.POST_back_to_review.bind(this));
        this.post('/api/admin/users/:id/request-changes', this.POST_request_changes.bind(this));
        this.get('/api/admin/users/:id/photo/url', this.GET_photo_url.bind(this));
        this.get('/api/admin/users/:id/media', this.GET_media.bind(this));
        this.get('/api/admin/users/:id/media/:mediaId/thumbnail', this.GET_media_thumbnail.bind(this));
        this.get('/api/admin/users/:id/projects', this.GET_projects.bind(this));
        this.get('/api/admin/users/:id/projects/:projectId/project-types', this.GET_project_types.bind(this));
        this.get('/api/admin/users/:id/availability', this.GET_availability.bind(this));
        this.get('/api/admin/users/:id/locales', this.GET_locales.bind(this));
        this.get('/api/admin/users/:id/work-profile', this.GET_work_profile.bind(this));
        this.get('/api/admin/users/:id/work-profiles', this.GET_work_profiles.bind(this));
    }

    protected async GET_users(ctx: Context, req: Request, res: Response): Promise<void> {
        if (!this.requireAdmin(ctx, req)) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const users = await this.userLogic.listUsers(ctx);
        const body = await Promise.all(users.map(async (user) => ({
            ...toDirectoryUserResponse(user),
            photo_url: await this.photoUrl(ctx, user.photo),
        })));
        this.checkAndRespond(ctx, res, body);
    }

    protected async GET_approvals(ctx: Context, req: Request, res: Response): Promise<void> {
        if (!this.requireAdmin(ctx, req)) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const approvals = await this.userLogic.listApprovals(ctx);
        const body = await Promise.all(approvals.map((approval) => this.toApprovalResponse(ctx, approval)));
        this.checkAndRespond(ctx, res, body);
    }

    protected async GET_user(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.requireUser(ctx, req);
        this.checkAndRespond(ctx, res, user ? toProfile(user) : undefined);
    }

    protected async POST_request_changes(ctx: Context, req: Request, res: Response): Promise<void> {
        if (!this.requireAdmin(ctx, req)) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = UserIdSchema.parse(req.params.id);
        const body = parseBody(RequestChangesSchema, req.body);
        const user = await this.userLogic.requestChanges(ctx, id, body.message);
        this.checkAndRespond(ctx, res, user ? toAdminUserResponse(user) : undefined);
    }

    protected async POST_back_to_review(ctx: Context, req: Request, res: Response): Promise<void> {
        if (!this.requireAdmin(ctx, req)) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = UserIdSchema.parse(req.params.id);
        const user = await this.userLogic.backToReview(ctx, id);
        this.checkAndRespond(ctx, res, user ? toAdminUserResponse(user) : undefined);
    }

    protected async POST_approve(ctx: Context, req: Request, res: Response): Promise<void> {
        if (!this.requireAdmin(ctx, req)) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = UserIdSchema.parse(req.params.id);
        const user = await this.userLogic.approveUser(ctx, id);
        this.checkAndRespond(ctx, res, user ? toAdminUserResponse(user) : undefined);
    }

    protected async GET_photo_url(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.requireUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }
        if (!user.photo) {
            ctx.error('Profile photo not found.', 404);
            this.checkAndRespond(ctx, res);
            return;
        }

        const objectPath = await this.userLogic.profilePhotoUrl(ctx, user.photo);
        if (!objectPath) {
            ctx.error('Profile photo not found.', 404);
            this.checkAndRespond(ctx, res);
            return;
        }

        this.checkAndRespond(ctx, res, {
            url: contentPath(objectPath),
            expires_in: profilePhotoTtlSeconds,
        });
    }

    protected async GET_media(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.requireUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const media = await this.userMediaLogic.listUserMedia(ctx, user.id);
        this.checkAndRespond(ctx, res, media);
    }

    protected async GET_media_thumbnail(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.requireUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const mediaId = MediaIdSchema.parse(req.params.mediaId);
        const thumbnail = await this.userMediaLogic.loadThumbnail(ctx, user.id, mediaId);
        if (!thumbnail) {
            this.checkAndRespond(ctx, res);
            return;
        }

        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.status(200).type(thumbnail.contentType).send(Buffer.from(thumbnail.data));
    }

    protected async GET_projects(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.requireUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const projects = await this.projectLogic.listProjects(ctx, user.id);
        this.checkAndRespond(ctx, res, projects);
    }

    protected async GET_project_types(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.requireUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const projectId = ProjectIdSchema.parse(req.params.projectId);
        const projectTypes = await this.projectProjectTypeLogic.listProjectProjectTypes(ctx, user.id, projectId);
        this.checkAndRespond(ctx, res, projectTypes);
    }

    protected async GET_availability(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.requireUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const availability = await this.userAvailabilityLogic.listUserAvailability(ctx, user.id);
        this.checkAndRespond(ctx, res, availability);
    }

    protected async GET_locales(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.requireUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const locales = await this.userLocaleLogic.listUserLocales(ctx, user.id);
        this.checkAndRespond(ctx, res, locales);
    }

    protected async GET_work_profile(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.requireUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const profile = await this.userWorkProfileLogic.getUserWorkProfile(ctx, user.id);
        this.checkAndRespond(ctx, res, profile);
    }

    protected async GET_work_profiles(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await this.requireUser(ctx, req);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const profiles = await this.userLogic.listWorkProfiles(ctx, user.id);
        this.checkAndRespond(ctx, res, profiles);
    }

    private async toApprovalResponse(ctx: Context, approval: Approval) {
        return {
            id: approval.id,
            first_name: approval.first_name,
            last_name: approval.last_name,
            email: approval.email,
            status: approval.status,
            account_type: approval.account_type,
            position: approval.position,
            discipline: approval.discipline,
            city: approval.city,
            day_rate: approval.day_rate,
            currency_code: approval.currency_code,
            union_status: approval.union_status,
            credit_count: approval.credit_count,
            media_count: approval.media_count,
            updated_at: approval.updated_at.toISOString(),
            photo_url: await this.photoUrl(ctx, approval.photo),
        };
    }

    private async photoUrl(ctx: Context, photo: string | null): Promise<string | null> {
        if (!photo) {
            return null;
        }
        try {
            const objectPath = await this.userLogic.profilePhotoUrl(ctx, photo);
            return objectPath ? contentPath(objectPath) : null;
        } catch {
            return null;
        }
    }

    private requireAdmin(ctx: Context, req: Request): boolean {
        if (isAdminClient(req)) {
            return true;
        }
        ctx.error('Admin sign-in is required.', 403);
        return false;
    }

    private async requireUser(ctx: Context, req: Request): Promise<User | null> {
        if (!this.requireAdmin(ctx, req)) {
            return null;
        }
        const id = UserIdSchema.parse(req.params.id);
        return this.userLogic.requireById(ctx, id);
    }
}

function toDirectoryUserResponse(user: DirectoryUser) {
    return {
        ...toAdminUserResponse(user),
        discipline: user.discipline,
        city: user.city,
        profile_count: user.profile_count,
    };
}

function toAdminUserResponse(user: AdminUser) {
    return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        account_type: user.account_type,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
    };
}

function toProfile(user: User) {
    return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        photo: user.photo,
        status: user.status,
        account_type: user.account_type,
    };
}

function contentPath(objectPath: string): string {
    if (!objectPath.startsWith('/') || objectPath.startsWith('//')) {
        throw new Error('Profile photo path is not valid.');
    }
    return `/content${objectPath}`;
}

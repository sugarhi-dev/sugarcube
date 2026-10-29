import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { ProjectLogic } from '../logic/projectLogic.js';
import { UserLogic } from '../logic/userLogic.js';
import { currentUser } from './currentUser.js';
import { parseBody } from './httpHelpers.js';

const ProjectIdSchema = z.ulid().meta({ description: 'Project id.' });

const SaveProjectRequestSchema = z.object({
    name: z.string().trim().min(1).max(255).meta({ description: 'Project name.' }),
    position_id: z.ulid().meta({ description: 'Position the user held on the project.' }),
    lead_producer_name: z.string().trim().min(1).meta({ description: 'Lead producer name.' }),
});

const UpdateProjectRequestSchema = z.object({
    name: z.string().trim().min(1).max(255).optional().meta({ description: 'Project name.' }),
    position_id: z.ulid().optional().meta({ description: 'Position the user held on the project.' }),
    lead_producer_name: z.string().trim().min(1).optional().meta({ description: 'Lead producer name.' }),
}).refine(
    (row) => row.name !== undefined || row.position_id !== undefined || row.lead_producer_name !== undefined,
    'At least one field is required.',
);

export const projectRequestSchemas = {
    ProjectId: ProjectIdSchema,
    SaveProjectRequest: SaveProjectRequestSchema,
    UpdateProjectRequest: UpdateProjectRequestSchema,
};

export class ProjectController extends Controller {
    private readonly userLogic: UserLogic;
    private readonly projectLogic: ProjectLogic;

    constructor(app: Express, userLogic: UserLogic, projectLogic: ProjectLogic) {
        super(app);
        this.userLogic = userLogic;
        this.projectLogic = projectLogic;
        this.get('/api/me/projects', this.GET_projects.bind(this));
        this.post('/api/me/projects', this.POST_project.bind(this));
        this.get('/api/me/projects/:id', this.GET_project.bind(this));
        this.patch('/api/me/projects/:id', this.PATCH_project.bind(this));
        this.delete('/api/me/projects/:id', this.DELETE_project.bind(this));
    }

    protected async GET_projects(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const projects = await this.projectLogic.listProjects(ctx, user.id);
        this.checkAndRespond(ctx, res, projects);
    }

    protected async POST_project(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const body = parseBody(SaveProjectRequestSchema, req.body);
        const project = await this.projectLogic.createProject(ctx, user.id, body);
        this.checkAndRespond(ctx, res, project, 201);
    }

    protected async GET_project(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = ProjectIdSchema.parse(req.params.id);
        const project = await this.projectLogic.getProject(ctx, user.id, id);
        this.checkAndRespond(ctx, res, project);
    }

    protected async PATCH_project(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = ProjectIdSchema.parse(req.params.id);
        const body = parseBody(UpdateProjectRequestSchema, req.body);
        const project = await this.projectLogic.updateProject(ctx, user.id, id, body);
        this.checkAndRespond(ctx, res, project);
    }

    protected async DELETE_project(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = ProjectIdSchema.parse(req.params.id);
        const project = await this.projectLogic.deleteProject(ctx, user.id, id);
        this.checkAndRespond(ctx, res, project);
    }
}

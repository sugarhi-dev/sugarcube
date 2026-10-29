import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { ProjectProjectTypeLogic } from '../logic/projectProjectTypeLogic.js';
import { UserLogic } from '../logic/userLogic.js';
import { currentUser } from './currentUser.js';
import { parseBody } from './httpHelpers.js';

const ProjectIdSchema = z.ulid().meta({ description: 'Project id.' });

const UpdateProjectProjectTypesRequestSchema = z.object({
    project_type_ids: z.array(z.ulid()).meta({ description: 'Project types attached to the project.' }),
}).refine(
    (row) => new Set(row.project_type_ids).size === row.project_type_ids.length,
    'Project types must be unique.',
);

export const projectProjectTypeRequestSchemas = {
    ProjectId: ProjectIdSchema,
    UpdateProjectProjectTypesRequest: UpdateProjectProjectTypesRequestSchema,
};

export class ProjectProjectTypeController extends Controller {
    private readonly userLogic: UserLogic;
    private readonly projectProjectTypeLogic: ProjectProjectTypeLogic;

    constructor(app: Express, userLogic: UserLogic, projectProjectTypeLogic: ProjectProjectTypeLogic) {
        super(app);
        this.userLogic = userLogic;
        this.projectProjectTypeLogic = projectProjectTypeLogic;
        this.get('/api/me/projects/:id/project-types', this.GET_project_project_types.bind(this));
        this.put('/api/me/projects/:id/project-types', this.PUT_project_project_types.bind(this));
    }

    protected async GET_project_project_types(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = ProjectIdSchema.parse(req.params.id);
        const projectTypes = await this.projectProjectTypeLogic.listProjectProjectTypes(ctx, user.id, id);
        this.checkAndRespond(ctx, res, projectTypes);
    }

    protected async PUT_project_project_types(ctx: Context, req: Request, res: Response): Promise<void> {
        const user = await currentUser(ctx, req, this.userLogic);
        if (!user) {
            this.checkAndRespond(ctx, res);
            return;
        }

        const id = ProjectIdSchema.parse(req.params.id);
        const body = parseBody(UpdateProjectProjectTypesRequestSchema, req.body);
        const projectTypes = await this.projectProjectTypeLogic.updateProjectProjectTypes(
            ctx,
            user.id,
            id,
            body.project_type_ids,
        );
        this.checkAndRespond(ctx, res, projectTypes);
    }
}

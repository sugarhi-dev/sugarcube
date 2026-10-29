import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { ProjectTypeLogic } from '../logic/projectTypeLogic.js';

const ProjectTypeIdSchema = z.ulid().meta({ description: 'Project type id.' });

export const projectTypeRequestSchemas = { ProjectTypeId: ProjectTypeIdSchema };

export class ProjectTypeController extends Controller {
    private readonly projectTypeLogic: ProjectTypeLogic;

    constructor(app: Express, projectTypeLogic: ProjectTypeLogic) {
        super(app);
        this.projectTypeLogic = projectTypeLogic;
        this.get('/api/project-types', this.GET_project_types.bind(this));
        this.get('/api/project-types/:id', this.GET_project_type.bind(this));
    }

    protected async GET_project_types(ctx: Context, _req: Request, res: Response): Promise<void> {
        const projectTypes = await this.projectTypeLogic.listProjectTypes(ctx);
        this.checkAndRespond(ctx, res, projectTypes);
    }

    protected async GET_project_type(ctx: Context, req: Request, res: Response): Promise<void> {
        const id = ProjectTypeIdSchema.parse(req.params.id);
        const projectType = await this.projectTypeLogic.getProjectType(ctx, id);
        this.checkAndRespond(ctx, res, projectType);
    }
}

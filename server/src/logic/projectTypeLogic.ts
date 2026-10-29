import { Context, Logic } from '@sugarcube/server-core';
import type { ProjectType } from '../entities/projectType.js';
import { ProjectTypeRepo } from '../repositories/projectTypeRepo.js';

export class ProjectTypeLogic extends Logic {
    private readonly projectTypeRepo: ProjectTypeRepo;

    constructor(projectTypeRepo: ProjectTypeRepo) {
        super();
        this.projectTypeRepo = projectTypeRepo;
    }

    listProjectTypes(ctx: Context): Promise<ProjectType[]> {
        return this.projectTypeRepo.listProjectTypes(ctx);
    }

    async getProjectType(ctx: Context, id: string): Promise<ProjectType | null> {
        const projectType = await this.projectTypeRepo.findProjectTypeById(ctx, id);
        if (!projectType) {
            ctx.error('Project type not found.', 404);
            return null;
        }
        return projectType;
    }
}

import { Context, Logic } from '@sugarcube/server-core';
import type { ProjectProjectType } from '../entities/projectProjectType.js';
import { ProjectProjectTypeRepo } from '../repositories/projectProjectTypeRepo.js';
import { constraintFailure } from './pgError.js';

const projectProjectTypeConstraints = {
    project_project_type_project_id_fkey: { statusCode: 404, message: 'Project not found.' },
    project_project_type_project_type_id_fkey: { statusCode: 400, message: 'Project type not found.' },
};

export class ProjectProjectTypeLogic extends Logic {
    private readonly projectProjectTypeRepo: ProjectProjectTypeRepo;

    constructor(projectProjectTypeRepo: ProjectProjectTypeRepo) {
        super();
        this.projectProjectTypeRepo = projectProjectTypeRepo;
    }

    async listProjectProjectTypes(
        ctx: Context,
        userProfileId: string,
        projectId: string,
    ): Promise<ProjectProjectType[] | null> {
        const rows = await this.projectProjectTypeRepo.listProjectProjectTypes(ctx, userProfileId, projectId);
        if (!rows) {
            ctx.error('Project not found.', 404);
            return null;
        }
        return rows;
    }

    async updateProjectProjectTypes(
        ctx: Context,
        userProfileId: string,
        projectId: string,
        projectTypeIds: string[],
    ): Promise<ProjectProjectType[] | null> {
        try {
            const rows = await this.projectProjectTypeRepo.replaceProjectProjectTypes(
                ctx,
                userProfileId,
                projectId,
                projectTypeIds,
            );
            if (!rows) {
                ctx.error('Project not found.', 404);
                return null;
            }
            return rows;
        } catch (error) {
            const failure = constraintFailure(error, projectProjectTypeConstraints);
            if (!failure) {
                throw error;
            }
            ctx.error(failure.message, failure.statusCode);
            return null;
        }
    }
}

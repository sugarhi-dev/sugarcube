import { Context, Logic } from '@sugarcube/server-core';
import { ulid } from 'ulidx';
import { ProjectSchema, type Project } from '../entities/project.js';
import { ProjectRepo } from '../repositories/projectRepo.js';
import { constraintFailure } from './pgError.js';

export type ProjectWrite = {
    name: string;
    position_id: string;
    lead_producer_name: string;
};

export type ProjectPatch = {
    name?: string;
    position_id?: string;
    lead_producer_name?: string;
};

const projectConstraints = {
    projects_user_profile_id_fkey: { statusCode: 404, message: 'Profile not found.' },
    projects_position_id_fkey: { statusCode: 400, message: 'Position not found.' },
};

export class ProjectLogic extends Logic {
    private readonly projectRepo: ProjectRepo;

    constructor(projectRepo: ProjectRepo) {
        super();
        this.projectRepo = projectRepo;
    }

    listProjects(ctx: Context, userProfileId: string): Promise<Project[]> {
        return this.projectRepo.listProjects(ctx, userProfileId);
    }

    async getProject(ctx: Context, userProfileId: string, id: string): Promise<Project | null> {
        const project = await this.projectRepo.findProject(ctx, userProfileId, id);
        if (!project) {
            ctx.error('Project not found.', 404);
            return null;
        }
        return project;
    }

    async createProject(ctx: Context, userProfileId: string, input: ProjectWrite): Promise<Project | null> {
        const project = ProjectSchema.parse({
            id: ulid(),
            user_profile_id: userProfileId,
            name: input.name,
            position_id: input.position_id,
            lead_producer_name: input.lead_producer_name,
        });
        try {
            return await this.projectRepo.createProject(ctx, project);
        } catch (error) {
            return this.rejectConstraint(ctx, error);
        }
    }

    async updateProject(
        ctx: Context,
        userProfileId: string,
        id: string,
        input: ProjectPatch,
    ): Promise<Project | null> {
        const existing = await this.projectRepo.findProject(ctx, userProfileId, id);
        if (!existing) {
            ctx.error('Project not found.', 404);
            return null;
        }

        const project = ProjectSchema.parse({
            ...existing,
            name: input.name ?? existing.name,
            position_id: input.position_id ?? existing.position_id,
            lead_producer_name: input.lead_producer_name ?? existing.lead_producer_name,
        });
        try {
            const updated = await this.projectRepo.updateProject(ctx, project);
            if (!updated) {
                ctx.error('Project not found.', 404);
                return null;
            }
            return updated;
        } catch (error) {
            return this.rejectConstraint(ctx, error);
        }
    }

    async deleteProject(ctx: Context, userProfileId: string, id: string): Promise<Project | null> {
        const existing = await this.projectRepo.findProject(ctx, userProfileId, id);
        if (!existing) {
            ctx.error('Project not found.', 404);
            return null;
        }

        const deleted = await this.projectRepo.deleteProject(ctx, userProfileId, id);
        if (!deleted) {
            ctx.error('Project not found.', 404);
            return null;
        }
        return existing;
    }

    private rejectConstraint(ctx: Context, error: unknown): null {
        const failure = constraintFailure(error, projectConstraints);
        if (!failure) {
            throw error;
        }
        ctx.error(failure.message, failure.statusCode);
        return null;
    }
}

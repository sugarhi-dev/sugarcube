import { Database, Repository, type Context } from '@sugarcube/server-core';
import { ProjectSchema, type Project } from '../entities/project.js';

type ProjectRow = {
    id: string;
    user_profile_id: string;
    name: string;
    position_id: string;
    lead_producer_name: string;
};

export class ProjectRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listProjects(ctx: Context, userProfileId: string): Promise<Project[]> {
        this.log.trace(`${ctx.traceId} select projects ${userProfileId}`);
        const result = await this.database.query<ProjectRow>(
            `SELECT id, user_profile_id, name, position_id, lead_producer_name
             FROM projects
             WHERE user_profile_id = $1
             ORDER BY created_at`,
            [userProfileId],
        );
        return result.rows.map((row) => ProjectSchema.parse(row));
    }

    async findProject(ctx: Context, userProfileId: string, id: string): Promise<Project | null> {
        this.log.trace(`${ctx.traceId} select projects ${id}`);
        const result = await this.database.query<ProjectRow>(
            `SELECT id, user_profile_id, name, position_id, lead_producer_name
             FROM projects
             WHERE id = $1 AND user_profile_id = $2`,
            [id, userProfileId],
        );
        const row = result.rows[0];
        return row ? ProjectSchema.parse(row) : null;
    }

    async createProject(ctx: Context, project: Project): Promise<Project> {
        this.log.trace(`${ctx.traceId} insert projects ${project.id}`);
        const result = await this.database.query<ProjectRow>(
            `INSERT INTO projects (id, user_profile_id, name, position_id, lead_producer_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, user_profile_id, name, position_id, lead_producer_name`,
            [project.id, project.user_profile_id, project.name, project.position_id, project.lead_producer_name],
        );
        return requiredRow(result.rows[0], `insert projects ${project.id}`);
    }

    async updateProject(ctx: Context, project: Project): Promise<Project | null> {
        this.log.trace(`${ctx.traceId} update projects ${project.id}`);
        const result = await this.database.query<ProjectRow>(
            `UPDATE projects
             SET name = $3,
                 position_id = $4,
                 lead_producer_name = $5,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_profile_id = $2
             RETURNING id, user_profile_id, name, position_id, lead_producer_name`,
            [project.id, project.user_profile_id, project.name, project.position_id, project.lead_producer_name],
        );
        const row = result.rows[0];
        return row ? ProjectSchema.parse(row) : null;
    }

    async deleteProject(ctx: Context, userProfileId: string, id: string): Promise<boolean> {
        this.log.trace(`${ctx.traceId} delete projects ${id}`);
        return this.database.transaction(async (query) => {
            await query(
                `DELETE FROM project_project_type
                 WHERE project_id = $1
                   AND EXISTS (
                       SELECT 1
                       FROM projects
                       WHERE projects.id = $1 AND projects.user_profile_id = $2
                   )`,
                [id, userProfileId],
            );
            const result = await query(
                `DELETE FROM projects
                 WHERE id = $1 AND user_profile_id = $2`,
                [id, userProfileId],
            );
            return (result.rowCount ?? 0) > 0;
        });
    }
}

function requiredRow(row: ProjectRow | undefined, action: string): Project {
    if (!row) {
        throw new Error(`${action} returned no row`);
    }
    return ProjectSchema.parse(row);
}

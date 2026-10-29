import { Database, Repository, type Context } from '@sugarcube/server-core';
import { ProjectProjectTypeSchema, type ProjectProjectType } from '../entities/projectProjectType.js';

type ProjectProjectTypeRow = {
    project_id: string;
    project_type_id: string;
};

export class ProjectProjectTypeRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listProjectProjectTypes(
        ctx: Context,
        userProfileId: string,
        projectId: string,
    ): Promise<ProjectProjectType[] | null> {
        this.log.trace(`${ctx.traceId} select project_project_type ${projectId}`);
        const project = await this.database.query<{ id: string }>(
            `SELECT id
             FROM projects
             WHERE id = $1 AND user_profile_id = $2`,
            [projectId, userProfileId],
        );
        if (!project.rows[0]) {
            return null;
        }

        const result = await this.database.query<ProjectProjectTypeRow>(
            `SELECT project_id, project_type_id
             FROM project_project_type
             WHERE project_id = $1
             ORDER BY created_at, project_type_id`,
            [projectId],
        );
        return result.rows.map((row) => ProjectProjectTypeSchema.parse(row));
    }

    async replaceProjectProjectTypes(
        ctx: Context,
        userProfileId: string,
        projectId: string,
        projectTypeIds: string[],
    ): Promise<ProjectProjectType[] | null> {
        this.log.trace(`${ctx.traceId} replace project_project_type ${projectId}`);
        return this.database.transaction(async (query) => {
            const project = await query<{ id: string }>(
                `SELECT id
                 FROM projects
                 WHERE id = $1 AND user_profile_id = $2
                 FOR UPDATE`,
                [projectId, userProfileId],
            );
            if (!project.rows[0]) {
                return null;
            }

            if (projectTypeIds.length === 0) {
                await query(
                    `DELETE FROM project_project_type
                     WHERE project_id = $1`,
                    [projectId],
                );
            } else {
                await query(
                    `DELETE FROM project_project_type
                     WHERE project_id = $1
                       AND project_type_id <> ALL($2::varchar[])`,
                    [projectId, projectTypeIds],
                );
                await query(
                    `INSERT INTO project_project_type (project_id, project_type_id)
                     SELECT $1, project_type_id
                     FROM unnest($2::varchar[]) AS project_type_id
                     ON CONFLICT (project_id, project_type_id) DO NOTHING`,
                    [projectId, projectTypeIds],
                );
            }

            const result = await query<ProjectProjectTypeRow>(
                `SELECT project_id, project_type_id
                 FROM project_project_type
                 WHERE project_id = $1
                 ORDER BY created_at, project_type_id`,
                [projectId],
            );
            return result.rows.map((row) => ProjectProjectTypeSchema.parse(row));
        });
    }
}

import { Database, Repository, type Context } from '@sugarcube/server-core';
import { ProjectTypeSchema, type ProjectType } from '../entities/projectType.js';

type ProjectTypeRow = {
    id: string;
    discipline_id: string;
    name: string;
};

export class ProjectTypeRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listProjectTypes(ctx: Context): Promise<ProjectType[]> {
        this.log.trace(`${ctx.traceId} select project_type`);
        const result = await this.database.query<ProjectTypeRow>(
            `SELECT id, discipline_id, name
             FROM project_type
             ORDER BY name`,
        );
        return result.rows.map((row) => ProjectTypeSchema.parse(row));
    }

    async findProjectTypeById(ctx: Context, id: string): Promise<ProjectType | null> {
        this.log.trace(`${ctx.traceId} select project_type ${id}`);
        const result = await this.database.query<ProjectTypeRow>(
            `SELECT id, discipline_id, name
             FROM project_type
             WHERE id = $1`,
            [id],
        );
        const row = result.rows[0];
        return row ? ProjectTypeSchema.parse(row) : null;
    }
}

import { Database, Repository, type Context } from '@sugarcube/server-core';
import { DisciplineSchema, type Discipline } from '../entities/discipline.js';

type DisciplineRow = {
    id: string;
    name: string;
};

export class DisciplineRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listDisciplines(ctx: Context): Promise<Discipline[]> {
        this.log.trace(`${ctx.traceId} select disciplines`);
        const result = await this.database.query<DisciplineRow>(
            `SELECT id, name
             FROM disciplines
             ORDER BY name`,
        );
        return result.rows.map((row) => DisciplineSchema.parse(row));
    }

    async findDisciplineById(ctx: Context, id: string): Promise<Discipline | null> {
        this.log.trace(`${ctx.traceId} select disciplines ${id}`);
        const result = await this.database.query<DisciplineRow>(
            `SELECT id, name
             FROM disciplines
             WHERE id = $1`,
            [id],
        );
        const row = result.rows[0];
        return row ? DisciplineSchema.parse(row) : null;
    }
}

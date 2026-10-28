import { Database, Repository, type Context } from '@sugarcube/server-core';
import { PositionSchema, type Position } from '../entities/position.js';

type PositionRow = {
    id: string;
    name: string;
};

export class PositionRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listPositions(ctx: Context): Promise<Position[]> {
        this.log.trace(`${ctx.traceId} select positions`);
        const result = await this.database.query<PositionRow>(
            `SELECT id, name
             FROM positions
             ORDER BY name`,
        );
        return result.rows.map((row) => PositionSchema.parse(row));
    }

    async findPositionById(ctx: Context, id: string): Promise<Position | null> {
        this.log.trace(`${ctx.traceId} select positions ${id}`);
        const result = await this.database.query<PositionRow>(
            `SELECT id, name
             FROM positions
             WHERE id = $1`,
            [id],
        );
        const row = result.rows[0];
        return row ? PositionSchema.parse(row) : null;
    }
}

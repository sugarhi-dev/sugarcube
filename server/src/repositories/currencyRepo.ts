import { Database, Repository, type Context } from '@sugarcube/server-core';
import { CurrencySchema, type Currency } from '../entities/currency.js';

type CurrencyRow = {
    id: string;
    code: string;
    name: string;
};

export class CurrencyRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listCurrencies(ctx: Context): Promise<Currency[]> {
        this.log.trace(`${ctx.traceId} select currency`);
        const result = await this.database.query<CurrencyRow>(
            `SELECT id, code, name
             FROM currency
             ORDER BY code`,
        );
        return result.rows.map((row) => CurrencySchema.parse(row));
    }

    async findCurrencyById(ctx: Context, id: string): Promise<Currency | null> {
        this.log.trace(`${ctx.traceId} select currency ${id}`);
        const result = await this.database.query<CurrencyRow>(
            `SELECT id, code, name
             FROM currency
             WHERE id = $1`,
            [id],
        );
        const row = result.rows[0];
        return row ? CurrencySchema.parse(row) : null;
    }
}

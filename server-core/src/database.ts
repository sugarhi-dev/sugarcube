import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { Base } from './base.js';
import { Config } from './config.js';

type QueryValues = unknown[];

type SqlQuery = <R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: QueryValues,
) => Promise<QueryResult<R>>;

export class Database extends Base {
    private readonly pool: Pool;

    constructor(config: Config) {
        super();
        const connectionString = config.require('DATABASE_URL');
        this.pool = new Pool({ connectionString });
    }

    query<R extends QueryResultRow = QueryResultRow>(
        text: string,
        values?: QueryValues,
    ): Promise<QueryResult<R>> {
        return this.pool.query<R>(text, values);
    }

    close(): Promise<void> {
        return this.pool.end();
    }

    async transaction<T>(run: (query: SqlQuery) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        const query: SqlQuery = (text, values) => client.query(text, values);

        try {
            await client.query('BEGIN');
            const result = await run(query);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

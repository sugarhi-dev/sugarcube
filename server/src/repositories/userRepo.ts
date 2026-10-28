import { Database, Repository, type Context } from '@sugarcube/server-core';
import { UserSchema, type User } from '../entities/user.js';

type UserRow = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    keycloak_id: string;
    status: string;
};

export class UserRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async createUser(ctx: Context, user: User): Promise<void> {
        this.log.trace(`${ctx.traceId} insert user_profile ${user.id}`);
        await this.database.query(
            `INSERT INTO user_profile (id, first_name, last_name, email, phone, keycloak_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (keycloak_id) DO UPDATE
             SET first_name = EXCLUDED.first_name,
                 last_name = EXCLUDED.last_name,
                 email = EXCLUDED.email,
                 updated_at = CURRENT_TIMESTAMP`,
            [user.id, user.first_name, user.last_name, user.email, user.phone, user.keycloak_id, user.status],
        );
    }

    async findUserByKeycloakId(ctx: Context, keycloakId: string): Promise<User | null> {
        this.log.trace(`${ctx.traceId} select user_profile ${keycloakId}`);
        const result = await this.database.query<UserRow>(
            `SELECT id, first_name, last_name, email, phone, keycloak_id, status
             FROM user_profile
             WHERE keycloak_id = $1`,
            [keycloakId],
        );
        const row = result.rows[0];
        return row ? UserSchema.parse(row) : null;
    }
}

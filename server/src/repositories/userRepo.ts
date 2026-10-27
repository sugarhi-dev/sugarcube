import { Database, Repository, type Context } from '@sugarcube/server-core';
import type { User } from '../entities/user.js';

export class UserRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async createUser(ctx: Context, user: User): Promise<void> {
        this.log.trace(`${ctx.traceId} insert user_profile ${user.id}`);
        await this.database.query(
            `INSERT INTO user_profile (id, first_name, last_name, email, keycloak_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (keycloak_id) DO UPDATE
             SET first_name = EXCLUDED.first_name,
                 last_name = EXCLUDED.last_name,
                 email = EXCLUDED.email,
                 updated_at = CURRENT_TIMESTAMP`,
            [user.id, user.first_name, user.last_name, user.email, user.keycloak_id],
        );
    }
}

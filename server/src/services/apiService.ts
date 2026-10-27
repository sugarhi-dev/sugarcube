import { RestService, Database, Service } from "@sugarcube/server-core";
import type { Express } from 'express';
import { UserRepo } from "../repositories/userRepo.js";
import { AuthController } from "../controllers/authcontroller.js";

export class ApiService extends RestService {
    private database: Database;

    constructor(app: Express, database: Database) {
        super('ApiService', app, ['/api/auth/oidc/callback']);
        this.database = database;
    }


    protected async beforeStart(): Promise<void> {
        await super.beforeStart();        

        const userRepo = new UserRepo(this.database);
        const authController = new AuthController(this.app, userRepo);
        this.addController(authController);
    }


}
import { RestService, Database } from '@sugarcube/server-core';
import type { Express } from 'express';
import { AuthController } from '../controllers/authcontroller.js';
import { CurrencyController } from '../controllers/currencyController.js';
import { DisciplineController } from '../controllers/disciplineController.js';
import { PositionController } from '../controllers/positionController.js';
import { ProductionCityController } from '../controllers/productionCityController.js';
import { UserController } from '../controllers/userController.js';
import { CurrencyLogic } from '../logic/currencyLogic.js';
import { DisciplineLogic } from '../logic/disciplineLogic.js';
import { PositionLogic } from '../logic/positionLogic.js';
import { ProductionCityLogic } from '../logic/productionCityLogic.js';
import { UserLocaleLogic } from '../logic/userLocaleLogic.js';
import { UserLogic } from '../logic/userLogic.js';
import { UserWorkProfileLogic } from '../logic/userWorkProfileLogic.js';
import { CurrencyRepo } from '../repositories/currencyRepo.js';
import { DisciplineRepo } from '../repositories/disciplineRepo.js';
import { PositionRepo } from '../repositories/positionRepo.js';
import { ProductionCityRepo } from '../repositories/productionCityRepo.js';
import { UserLocaleRepo } from '../repositories/userLocaleRepo.js';
import { UserRepo } from '../repositories/userRepo.js';
import { UserWorkProfileRepo } from '../repositories/userWorkProfileRepo.js';

export class ApiService extends RestService {
    private database: Database;

    constructor(app: Express, database: Database) {
        super('ApiService', app, ['/api/auth/oidc/callback']);
        this.database = database;
    }

    protected async beforeStart(): Promise<void> {
        await super.beforeStart();

        const userRepo = new UserRepo(this.database);
        const currencyRepo = new CurrencyRepo(this.database);
        const productionCityRepo = new ProductionCityRepo(this.database);
        const disciplineRepo = new DisciplineRepo(this.database);
        const positionRepo = new PositionRepo(this.database);
        const userLocaleRepo = new UserLocaleRepo(this.database);
        const userWorkProfileRepo = new UserWorkProfileRepo(this.database);

        const userLogic = new UserLogic(userRepo);
        const currencyLogic = new CurrencyLogic(currencyRepo);
        const productionCityLogic = new ProductionCityLogic(productionCityRepo);
        const disciplineLogic = new DisciplineLogic(disciplineRepo);
        const positionLogic = new PositionLogic(positionRepo);
        const userLocaleLogic = new UserLocaleLogic(userLocaleRepo);
        const userWorkProfileLogic = new UserWorkProfileLogic(userWorkProfileRepo);

        this.addController(new AuthController(this.app, userLogic));
        this.addController(new CurrencyController(this.app, currencyLogic));
        this.addController(new ProductionCityController(this.app, productionCityLogic));
        this.addController(new DisciplineController(this.app, disciplineLogic));
        this.addController(new PositionController(this.app, positionLogic));
        this.addController(new UserController(this.app, userLogic, userLocaleLogic, userWorkProfileLogic));
    }
}
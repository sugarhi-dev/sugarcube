import { Binary, Config, Database, RestService } from '@sugarcube/server-core';
import type { Express } from 'express';
import { AuthController } from '../controllers/authcontroller.js';
import { CurrencyController } from '../controllers/currencyController.js';
import { DisciplineController } from '../controllers/disciplineController.js';
import { PositionController } from '../controllers/positionController.js';
import { ProductionCityController } from '../controllers/productionCityController.js';
import { ProjectController } from '../controllers/projectController.js';
import { ProjectProjectTypeController } from '../controllers/projectProjectTypeController.js';
import { ProjectTypeController } from '../controllers/projectTypeController.js';
import { UserController } from '../controllers/userController.js';
import { UserMediaController } from '../controllers/userMediaController.js';
import { CurrencyLogic } from '../logic/currencyLogic.js';
import { DisciplineLogic } from '../logic/disciplineLogic.js';
import { PositionLogic } from '../logic/positionLogic.js';
import { ProductionCityLogic } from '../logic/productionCityLogic.js';
import { ProjectLogic } from '../logic/projectLogic.js';
import { ProjectProjectTypeLogic } from '../logic/projectProjectTypeLogic.js';
import { ProjectTypeLogic } from '../logic/projectTypeLogic.js';
import { UserLocaleLogic } from '../logic/userLocaleLogic.js';
import { UserLogic } from '../logic/userLogic.js';
import { UserMediaLogic } from '../logic/userMediaLogic.js';
import { UserWorkProfileLogic } from '../logic/userWorkProfileLogic.js';
import { CurrencyRepo } from '../repositories/currencyRepo.js';
import { DisciplineRepo } from '../repositories/disciplineRepo.js';
import { PositionRepo } from '../repositories/positionRepo.js';
import { ProductionCityRepo } from '../repositories/productionCityRepo.js';
import { ProjectRepo } from '../repositories/projectRepo.js';
import { ProjectProjectTypeRepo } from '../repositories/projectProjectTypeRepo.js';
import { ProjectTypeRepo } from '../repositories/projectTypeRepo.js';
import { UserLocaleRepo } from '../repositories/userLocaleRepo.js';
import { UserRepo } from '../repositories/userRepo.js';
import { UserMediaRepo } from '../repositories/userMediaRepo.js';
import { UserWorkProfileRepo } from '../repositories/userWorkProfileRepo.js';

export class ApiService extends RestService {
    private database: Database;
    private readonly config: Config;

    constructor(config: Config, app: Express, database: Database) {
        super(config, 'ApiService', app, ['/api/auth/oidc/callback']);
        this.database = database;
        this.config = config;
    }

    protected async beforeStart(): Promise<void> {
        await super.beforeStart();

        const userRepo = new UserRepo(this.database);
        const currencyRepo = new CurrencyRepo(this.database);
        const productionCityRepo = new ProductionCityRepo(this.database);
        const disciplineRepo = new DisciplineRepo(this.database);
        const positionRepo = new PositionRepo(this.database);
        const projectRepo = new ProjectRepo(this.database);
        const projectProjectTypeRepo = new ProjectProjectTypeRepo(this.database);
        const projectTypeRepo = new ProjectTypeRepo(this.database);
        const userLocaleRepo = new UserLocaleRepo(this.database);
        const userMediaRepo = new UserMediaRepo(this.database);
        const userWorkProfileRepo = new UserWorkProfileRepo(this.database);

        const binary = new Binary(this.config);
        const userLogic = new UserLogic(userRepo, binary);
        const currencyLogic = new CurrencyLogic(currencyRepo);
        const productionCityLogic = new ProductionCityLogic(productionCityRepo);
        const disciplineLogic = new DisciplineLogic(disciplineRepo);
        const positionLogic = new PositionLogic(positionRepo);
        const projectLogic = new ProjectLogic(projectRepo);
        const projectProjectTypeLogic = new ProjectProjectTypeLogic(projectProjectTypeRepo);
        const projectTypeLogic = new ProjectTypeLogic(projectTypeRepo);
        const userLocaleLogic = new UserLocaleLogic(userLocaleRepo);
        const userMediaLogic = new UserMediaLogic(userMediaRepo, binary);
        const userWorkProfileLogic = new UserWorkProfileLogic(userWorkProfileRepo);

        this.addController(new AuthController(this.config, this.app, userLogic));
        this.addController(new CurrencyController(this.app, currencyLogic));
        this.addController(new ProductionCityController(this.app, productionCityLogic));
        this.addController(new DisciplineController(this.app, disciplineLogic));
        this.addController(new PositionController(this.app, positionLogic));
        this.addController(new ProjectTypeController(this.app, projectTypeLogic));
        this.addController(new ProjectController(this.app, userLogic, projectLogic));
        this.addController(new ProjectProjectTypeController(this.app, userLogic, projectProjectTypeLogic));
        this.addController(new UserController(this.app, userLogic, userLocaleLogic, userWorkProfileLogic));
        this.addController(new UserMediaController(this.app, userLogic, userMediaLogic));
    }
}
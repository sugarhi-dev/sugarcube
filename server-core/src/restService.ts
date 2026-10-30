import type { Express } from 'express';
import { Service } from './service.js';
import { Controller } from './controller.js';
import { Config } from './config.js';
import { JwtValidator } from './jwtValidator.js';

export class RestService extends Service {
    protected app: Express;

    protected controllers: Controller[];

    private anonymousPaths: string[] = [];
    private readonly jwtValidator: JwtValidator;

    constructor(config: Config, name: string, app: Express, anonymousPaths: string[] = [])
    {
        super(name);
        this.app = app;
        this.controllers = [];
        this.anonymousPaths = anonymousPaths;
        this.jwtValidator = new JwtValidator(config);
    }

    protected async beforeStart(): Promise<void>
    {
        await this.jwtValidator.loadSigningKeys();

        this.app.use(async (req: any, res: any, next: any) => {
            if (this.anonymousPaths.some((path) => req.path === path || 
                                                   req.path.startsWith(`${path}/`))) {
                return next();
            }

            const authHeader = req.headers['authorization'] || req.headers['Authorization'];
            if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring('Bearer '.length);
                const payload = await this.jwtValidator.validate(token);
                if (payload) {
                    req.auth = payload;
                } else {
                    res.status(401).json({ error: 'Unauthorized' });
                    return;
                }
            } else {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            next();
        });
    }

    protected addController(controller: Controller)
    {
        this.controllers.push(controller);
    }
}

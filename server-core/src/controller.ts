import { Base } from './base.js';
import type { Request, Response, Express } from 'express';
import { Context } from './context.js';

type Handler = (ctx: Context, req: Request, res: Response) => void | Promise<void>;

export class Controller extends Base {
    protected app: Express;

    constructor(app: Express) {
        super();
        this.app = app;
    }

    private async instrument(verb: string, path: string, req: Request, res: Response, handler: Handler, requireRoles: string[] = []): Promise<void> {
        const ctx = new Context();        
        this.log.trace(`${ctx.traceId} [${verb}] ${path}`);
        const start = performance.now();                   
        
        if (requireRoles.length > 0) {
            const auth = (req as any).auth;
            if (!auth) {
                res.sendStatus(401);
                return;
            }
            const granted_roles: string[] = auth.realm_access?.roles ?? [];
            if (!granted_roles.some((role: string) => requireRoles.includes(role))) {
                ctx.error('Forbidden', 403);
                res.sendStatus(403);
                return;
            }
        }
        
        try {
            await handler(ctx, req, res);
        }
        finally {            
        }        
    }

    protected get(path: string, handler: Handler, requireRoles: string[] = [])
    {        
        this.app.get(path, (req, res) => this.instrument('GET', path, req, res, handler, requireRoles));
    }

    protected post(path: string, handler: Handler, requireRoles: string[] = [])
    {
        this.app.post(path, (req, res) => this.instrument('POST', path, req, res, handler, requireRoles));
    }

    protected put(path: string, handler: Handler, requireRoles: string[] = [])
    {
        this.app.put(path, (req, res) => this.instrument('PUT', path, req, res, handler, requireRoles));
    }

    protected delete(path: string, handler: Handler, requireRoles: string[] = [])
    {
        this.app.delete(path, (req, res) => this.instrument('DELETE', path, req, res, handler, requireRoles));
    }

    protected patch(path: string, handler: Handler, requireRoles: string[] = [])
    {
        this.app.patch(path, (req, res) => this.instrument('PATCH', path, req, res, handler, requireRoles));
    }

    protected checkAndRespond(ctx: Context, res: Response, data?: any, statusCode: number = 200): void {
        if (ctx.hasError) {
            res.status(ctx.userErrorStatusCode).json({ error_message: ctx.userError });            
            return;
        }
        else {
            res.status(statusCode).json(data);  
            return;
        }
    }
}
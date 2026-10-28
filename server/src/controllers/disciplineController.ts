import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { DisciplineLogic } from '../logic/disciplineLogic.js';

const DisciplineIdSchema = z.ulid().meta({ description: 'Discipline id.' });

export const disciplineRequestSchemas = { DisciplineId: DisciplineIdSchema };

export class DisciplineController extends Controller {
    private readonly disciplineLogic: DisciplineLogic;

    constructor(app: Express, disciplineLogic: DisciplineLogic) {
        super(app);
        this.disciplineLogic = disciplineLogic;
        this.get('/api/disciplines', this.GET_disciplines.bind(this));
        this.get('/api/disciplines/:id', this.GET_discipline.bind(this));
    }

    protected async GET_disciplines(ctx: Context, _req: Request, res: Response): Promise<void> {
        const disciplines = await this.disciplineLogic.listDisciplines(ctx);
        this.checkAndRespond(ctx, res, disciplines);
    }

    protected async GET_discipline(ctx: Context, req: Request, res: Response): Promise<void> {
        const id = DisciplineIdSchema.parse(req.params.id);
        const discipline = await this.disciplineLogic.getDiscipline(ctx, id);
        this.checkAndRespond(ctx, res, discipline);
    }
}

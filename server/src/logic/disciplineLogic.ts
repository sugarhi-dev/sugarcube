import { Context, Logic } from '@sugarcube/server-core';
import type { Discipline } from '../entities/discipline.js';
import { DisciplineRepo } from '../repositories/disciplineRepo.js';

export class DisciplineLogic extends Logic {
    private readonly disciplineRepo: DisciplineRepo;

    constructor(disciplineRepo: DisciplineRepo) {
        super();
        this.disciplineRepo = disciplineRepo;
    }

    listDisciplines(ctx: Context): Promise<Discipline[]> {
        return this.disciplineRepo.listDisciplines(ctx);
    }

    async getDiscipline(ctx: Context, id: string): Promise<Discipline | null> {
        const discipline = await this.disciplineRepo.findDisciplineById(ctx, id);
        if (!discipline) {
            ctx.error('Discipline not found.', 404);
            return null;
        }
        return discipline;
    }
}

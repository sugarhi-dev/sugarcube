import { Context, Logic } from '@sugarcube/server-core';
import type { Position } from '../entities/position.js';
import { PositionRepo } from '../repositories/positionRepo.js';

export class PositionLogic extends Logic {
    private readonly positionRepo: PositionRepo;

    constructor(positionRepo: PositionRepo) {
        super();
        this.positionRepo = positionRepo;
    }

    listPositions(ctx: Context): Promise<Position[]> {
        return this.positionRepo.listPositions(ctx);
    }

    async getPosition(ctx: Context, id: string): Promise<Position | null> {
        const position = await this.positionRepo.findPositionById(ctx, id);
        if (!position) {
            ctx.error('Position not found.', 404);
            return null;
        }
        return position;
    }
}

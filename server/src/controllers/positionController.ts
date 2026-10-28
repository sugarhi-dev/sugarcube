import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { PositionLogic } from '../logic/positionLogic.js';

const PositionIdSchema = z.ulid().meta({ description: 'Position id.' });

export const positionRequestSchemas = { PositionId: PositionIdSchema };

export class PositionController extends Controller {
    private readonly positionLogic: PositionLogic;

    constructor(app: Express, positionLogic: PositionLogic) {
        super(app);
        this.positionLogic = positionLogic;
        this.get('/api/positions', this.GET_positions.bind(this));
        this.get('/api/positions/:id', this.GET_position.bind(this));
    }

    protected async GET_positions(ctx: Context, _req: Request, res: Response): Promise<void> {
        const positions = await this.positionLogic.listPositions(ctx);
        this.checkAndRespond(ctx, res, positions);
    }

    protected async GET_position(ctx: Context, req: Request, res: Response): Promise<void> {
        const id = PositionIdSchema.parse(req.params.id);
        const position = await this.positionLogic.getPosition(ctx, id);
        this.checkAndRespond(ctx, res, position);
    }
}

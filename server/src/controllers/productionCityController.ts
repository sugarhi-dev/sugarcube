import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { ProductionCityLogic } from '../logic/productionCityLogic.js';

const ProductionCityIdSchema = z.ulid().meta({ description: 'Production city id.' });

export const productionCityRequestSchemas = { ProductionCityId: ProductionCityIdSchema };

export class ProductionCityController extends Controller {
    private readonly productionCityLogic: ProductionCityLogic;

    constructor(app: Express, productionCityLogic: ProductionCityLogic) {
        super(app);
        this.productionCityLogic = productionCityLogic;
        this.get('/api/production-cities', this.GET_production_cities.bind(this));
        this.get('/api/production-cities/:id', this.GET_production_city.bind(this));
    }

    protected async GET_production_cities(ctx: Context, _req: Request, res: Response): Promise<void> {
        const cities = await this.productionCityLogic.listProductionCities(ctx);
        this.checkAndRespond(ctx, res, cities);
    }

    protected async GET_production_city(ctx: Context, req: Request, res: Response): Promise<void> {
        const id = ProductionCityIdSchema.parse(req.params.id);
        const city = await this.productionCityLogic.getProductionCity(ctx, id);
        this.checkAndRespond(ctx, res, city);
    }
}

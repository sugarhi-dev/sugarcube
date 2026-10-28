import { Context, Logic } from '@sugarcube/server-core';
import type { ProductionCity } from '../entities/productionCity.js';
import { ProductionCityRepo } from '../repositories/productionCityRepo.js';

export class ProductionCityLogic extends Logic {
    private readonly productionCityRepo: ProductionCityRepo;

    constructor(productionCityRepo: ProductionCityRepo) {
        super();
        this.productionCityRepo = productionCityRepo;
    }

    listProductionCities(ctx: Context): Promise<ProductionCity[]> {
        return this.productionCityRepo.listProductionCities(ctx);
    }

    async getProductionCity(ctx: Context, id: string): Promise<ProductionCity | null> {
        const city = await this.productionCityRepo.findProductionCityById(ctx, id);
        if (!city) {
            ctx.error('Production city not found.', 404);
            return null;
        }
        return city;
    }
}

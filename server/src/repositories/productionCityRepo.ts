import { Database, Repository, type Context } from '@sugarcube/server-core';
import { ProductionCitySchema, type ProductionCity } from '../entities/productionCity.js';

type ProductionCityRow = {
    id: string;
    name: string;
    country_code: string;
    latitude: string;
    longitude: string;
};

export class ProductionCityRepo extends Repository {
    constructor(database: Database) {
        super(database);
    }

    async listProductionCities(ctx: Context): Promise<ProductionCity[]> {
        this.log.trace(`${ctx.traceId} select production_cities`);
        const result = await this.database.query<ProductionCityRow>(
            `SELECT id, name, country_code, latitude, longitude
             FROM production_cities
             ORDER BY country_code, name`,
        );
        return result.rows.map((row) => mapProductionCity(row));
    }

    async findProductionCityById(ctx: Context, id: string): Promise<ProductionCity | null> {
        this.log.trace(`${ctx.traceId} select production_cities ${id}`);
        const result = await this.database.query<ProductionCityRow>(
            `SELECT id, name, country_code, latitude, longitude
             FROM production_cities
             WHERE id = $1`,
            [id],
        );
        const row = result.rows[0];
        return row ? mapProductionCity(row) : null;
    }
}

function mapProductionCity(row: ProductionCityRow): ProductionCity {
    return ProductionCitySchema.parse({
        id: row.id,
        name: row.name,
        country_code: row.country_code,
        latitude: numeric(row.latitude, 6),
        longitude: numeric(row.longitude, 6),
    });
}

function numeric(value: string, scale: number): number {
    return Number(Number(value).toFixed(scale));
}

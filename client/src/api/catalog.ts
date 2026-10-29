import {
    CurrencySchema,
    DisciplineSchema,
    PositionSchema,
    ProductionCitySchema,
    ProjectTypeSchema,
    type Currency,
    type Discipline,
    type Position,
    type ProductionCity,
    type ProjectType,
} from '@sugarcube/schema';
import { z } from 'zod';
import { apiJson } from './http.ts';
import { parseResponseList } from './parse.ts';

export type { Currency, Discipline, Position, ProductionCity, ProjectType };

export function listDisciplines(accessToken: string): Promise<Discipline[]> {
    return readList(accessToken, '/api/disciplines', DisciplineSchema, 'Disciplines response was not valid.');
}

export function listPositions(accessToken: string): Promise<Position[]> {
    return readList(accessToken, '/api/positions', PositionSchema, 'Positions response was not valid.');
}

export function listCurrencies(accessToken: string): Promise<Currency[]> {
    return readList(accessToken, '/api/currencies', CurrencySchema, 'Currencies response was not valid.');
}

export function listProductionCities(accessToken: string): Promise<ProductionCity[]> {
    return readList(accessToken, '/api/production-cities', ProductionCitySchema, 'Cities response was not valid.');
}

export function listProjectTypes(accessToken: string): Promise<ProjectType[]> {
    return readList(accessToken, '/api/project-types', ProjectTypeSchema, 'Project types response was not valid.');
}

async function readList<T extends z.ZodType>(
    accessToken: string,
    path: string,
    item: T,
    message: string,
): Promise<Array<z.output<T>>> {
    const body = await apiJson(accessToken, path);
    return parseResponseList(item, body, message);
}

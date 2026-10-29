import { ApiError, apiJson } from './http.ts';

export type Discipline = {
    id: string;
    name: string;
};

export type Position = {
    id: string;
    discipline_id: string;
    name: string;
};

export type Currency = {
    id: string;
    code: string;
    name: string;
};

export type ProductionCity = {
    id: string;
    name: string;
    country_code: string;
};

export type ProjectType = {
    id: string;
    discipline_id: string;
    name: string;
};

export function listDisciplines(accessToken: string): Promise<Discipline[]> {
    return readList(accessToken, '/api/disciplines', isDiscipline, 'Disciplines');
}

export function listPositions(accessToken: string): Promise<Position[]> {
    return readList(accessToken, '/api/positions', isPosition, 'Positions');
}

export function listCurrencies(accessToken: string): Promise<Currency[]> {
    return readList(accessToken, '/api/currencies', isCurrency, 'Currencies');
}

export function listProductionCities(accessToken: string): Promise<ProductionCity[]> {
    return readList(accessToken, '/api/production-cities', isProductionCity, 'Cities');
}

export function listProjectTypes(accessToken: string): Promise<ProjectType[]> {
    return readList(accessToken, '/api/project-types', isProjectType, 'Project types');
}

async function readList<T>(
    accessToken: string,
    path: string,
    item: (value: unknown) => value is T,
    label: string,
): Promise<T[]> {
    const body = await apiJson(accessToken, path);
    if (!Array.isArray(body) || !body.every(item)) {
        throw new ApiError(502, `${label} response was not valid.`);
    }
    return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isDiscipline(value: unknown): value is Discipline {
    return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
}

function isPosition(value: unknown): value is Position {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.discipline_id === 'string'
        && typeof value.name === 'string';
}

function isCurrency(value: unknown): value is Currency {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.code === 'string'
        && typeof value.name === 'string';
}

function isProductionCity(value: unknown): value is ProductionCity {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.name === 'string'
        && typeof value.country_code === 'string';
}

function isProjectType(value: unknown): value is ProjectType {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.discipline_id === 'string'
        && typeof value.name === 'string';
}

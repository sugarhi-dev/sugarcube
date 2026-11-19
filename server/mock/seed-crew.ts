/**
 * Insert 100 live crew accounts.
 *
 *   npm run seed-local
 *   npm run seed-test
 *   node server/mock/seed-crew.ts [local|test|path]
 *
 * Loads server/config/<env>/.env (default local). ENV_FILE wins over the argument.
 * Running again replaces accounts whose keycloak id starts with mock-crew-.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Binary, Config, Database } from '@sugarcube/server-core';
import dotenv from 'dotenv';
import { ulid } from 'ulidx';

const crewCount = 100;
const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const mockKeycloakPrefix = 'mock-crew-';
const mockEmailDomain = 'mock.sugarcube.test';
const ulidPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/;

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(serverRoot, '..');
const mediaDir = path.join(repoRoot, 'tests/media');
const profileDir = path.join(mediaDir, 'profiles');
const galleryPhotoPath = path.join(mediaDir, 'photo.jpg');

const firstNames = [
    'Amina', 'Andre', 'Bianca', 'Calvin', 'Chioma', 'Diego', 'Elena', 'Farah',
    'Gabriel', 'Hana', 'Idris', 'June', 'Kai', 'Leila', 'Mateo', 'Noor',
    'Omar', 'Priya', 'Quinn', 'Rosa', 'Soren', 'Talia', 'Uma', 'Victor',
    'Willa', 'Xavier', 'Yara', 'Zola', 'Aisha', 'Bruno', 'Camille', 'Devon',
    'Esme', 'Felix', 'Greta', 'Hiro', 'Ines', 'Jonah', 'Keiko', 'Lukas',
    'Mara', 'Nico', 'Opal', 'Pavel', 'Rafi', 'Sable', 'Theo', 'Vera',
    'Wes', 'Yusuf',
];

const lastNames = [
    'Adler', 'Banerjee', 'Cho', 'Diallo', 'Estrada', 'Ferreira', 'Gupta', 'Hassan',
    'Ibrahim', 'Jensen', 'Kowalski', 'Laurent', 'Moreau', 'Nakamura', 'Okoye', 'Petrov',
    'Quintero', 'Rahman', 'Silva', 'Tadesse', 'Ueda', 'Varga', 'Walsh', 'Xu',
    'Yilmaz', 'Zimmer', 'Almeida', 'Berg', 'Costa', 'Duarte', 'Engel', 'Fischer',
    'Garcia', 'Holm', 'Iversen', 'Johal', 'Khoury', 'Lind', 'Mensah', 'Novak',
    'Okafor', 'Park', 'Reyes', 'Sato', 'Tran', 'Unger', 'Voss', 'Weber',
    'Young', 'Zaki',
];

const credits = [
    'Glass Harbor', 'Late Checkout', 'Northline', 'Paper Saints', 'Red Kiln',
    'Salt and Silver', 'The Overnight', 'Velvet Circuit', 'White Orchard', 'Yellow Tape',
    'Copper Season', 'Drift Club', 'East Window', 'Field Notes', 'Gold Hour',
    'Half Light', 'Iron Orchard', 'Juniper Row', 'Kindling', 'Low Country',
    'Mirror Lake', 'Night Market', 'Open Water', 'Parcel', 'Quiet Room',
    'River Mouth', 'Second Shift', 'Third Rail', 'Understudy', 'Wild Rice',
];

const companies = [
    'Harbor and Co', 'Kinetic Pictures', 'Lumen Street', 'North Room', 'Orchard Post',
    'Parcel Films', 'Quiet Frame', 'Relay Studio', 'South Lot', 'Tin Whistle',
];

const producers = [
    'Amina Shah', 'Chris Delgado', 'Elena Voss', 'Jonah Park', 'Leila Mensah',
    'Mateo Ruiz', 'Noor Rahman', 'Priya Shah', 'Soren Lind', 'Talia Berg',
];

const euroCountries = new Set(['DE', 'ES', 'FR', 'IE', 'IT', 'NL']);

type Position = {
    id: string;
    name: string;
    discipline_id: string;
    discipline: string;
};

type City = {
    id: string;
    name: string;
    country_code: string;
};

type Currency = {
    id: string;
    code: string;
};

type ProjectType = {
    id: string;
    name: string;
    discipline_id: string;
};

type CrewDraft = {
    index: number;
    first: string;
    last: string;
    email: string;
    phone: string;
    keycloakId: string;
    position: Position;
    home: City;
    cities: City[];
    currency: Currency;
    unionStatus: 'union' | 'non_union' | 'either';
    flatFee: boolean;
    dayRate: number;
    years: number;
    projectsCompleted: number;
    responseHours: number;
    bio: string;
    videoCount: number;
    projects: Array<{
        name: string;
        date: string;
        company: string;
        producer: string;
        producerEmail: string;
        typeIds: string[];
    }>;
    availability: Array<{
        from: string;
        to: string;
        code: 'booked' | 'unavailable';
    }>;
};

async function main(): Promise<void> {
    const envFile = resolveEnvFile();
    if (!existsSync(envFile)) {
        throw new Error(`Env file not found: ${envFile}`);
    }
    dotenv.config({ path: envFile, override: true, quiet: true });
    const config = new Config(envFile);
    for (const key of ['DATABASE_URL', 'S3_ENDPOINT', 'S3_BUCKET']) {
        if (!process.env[key]) {
            throw new Error(`${key} is not set in ${envFile}`);
        }
    }

    const database = new Database(config);
    const binary = new Binary(config);
    const uploaded: string[] = [];

    try {
        const [positions, cities, currencies, projectTypes, galleryPhoto] = await Promise.all([
            loadPositions(database),
            loadCities(database),
            loadCurrencies(database),
            loadProjectTypes(database),
            readFile(galleryPhotoPath),
        ]);
        if (!isJpeg(galleryPhoto)) {
            throw new Error(`${galleryPhotoPath} is not a JPEG.`);
        }
        if (positions.length === 0) {
            throw new Error('No positions in the database. Run migrations before seeding crew.');
        }
        if (cities.length === 0 || currencies.length === 0) {
            throw new Error('Cities and currencies must exist before seeding crew.');
        }

        const chosen = assignPositions(positions, crewCount);
        const profiles = await ensureProfilePhotos(crewCount);
        const drafts = chosen.map((position, index) => buildCrew(
            index,
            position,
            cities,
            currencies,
            projectTypes,
        ));

        const previousIds = await loadMockAccountIds(database);
        const previousFiles = await loadMockFiles(database, previousIds);

        console.log(`Seeding ${drafts.length} crew from ${path.relative(repoRoot, envFile)}`);
        console.log(`Positions in the database: ${positions.length}. Using ${new Set(chosen.map((row) => row.id)).size} kinds.`);

        const profileIds = await mapPool(profiles, 8, (file) => binary.store(file, 'image/jpeg'));
        uploaded.push(...profileIds);
        const galleryIds = await mapPool(drafts, 8, () => binary.store(galleryPhoto, 'image/jpeg'));
        uploaded.push(...galleryIds);

        await database.transaction(async (query) => {
            if (previousIds.length > 0) {
                await deleteMockRows(query, previousIds);
            }
            for (let index = 0; index < drafts.length; index += 1) {
                const draft = drafts[index];
                const profileId = profileIds[index];
                const galleryId = galleryIds[index];
                if (!draft || !profileId || !galleryId) {
                    throw new Error(`Missing seeded row ${index}`);
                }
                await insertCrew(query, draft, profileId, galleryId);
            }
        });

        await removeFiles(binary, previousFiles);
        const byDiscipline = countBy(chosen, (row) => row.discipline);
        console.log(`Inserted ${drafts.length} live crew (${formatCounts(byDiscipline)}).`);
        console.log(`Profile photos: ${path.relative(repoRoot, profileDir)}`);
        console.log(`Each account has photo.jpg and ${drafts[0]?.videoCount ?? 1}–${Math.max(...drafts.map((row) => row.videoCount))} YouTube videos.`);
    } catch (error) {
        await removeFiles(binary, uploaded);
        throw error;
    } finally {
        await database.close();
    }
}

function resolveEnvFile(): string {
    const fromEnv = process.env.ENV_FILE;
    if (fromEnv) {
        return path.resolve(fromEnv);
    }
    const arg = process.argv[2] ?? 'local';
    if (arg.includes('/') || arg.endsWith('.env')) {
        return path.resolve(arg);
    }
    if (!/^[A-Za-z0-9_-]+$/.test(arg)) {
        throw new Error(`Unknown environment "${arg}". Pass local, test, or a path to an .env file.`);
    }
    const file = path.join(serverRoot, 'config', arg, '.env');
    return file;
}

async function loadPositions(database: Database): Promise<Position[]> {
    const result = await database.query<Position>(
        `SELECT position.id,
                position.name,
                position.discipline_id,
                discipline.name AS discipline
         FROM positions position
         JOIN disciplines discipline ON discipline.id = position.discipline_id
         ORDER BY discipline.name, position.name`,
    );
    return result.rows;
}

async function loadCities(database: Database): Promise<City[]> {
    const result = await database.query<City>(
        `SELECT id, name, TRIM(country_code) AS country_code
         FROM production_cities
         ORDER BY name`,
    );
    return result.rows;
}

async function loadCurrencies(database: Database): Promise<Currency[]> {
    const result = await database.query<Currency>(
        `SELECT id, TRIM(code) AS code
         FROM currency
         ORDER BY code`,
    );
    return result.rows;
}

async function loadProjectTypes(database: Database): Promise<ProjectType[]> {
    const result = await database.query<ProjectType>(
        `SELECT id, name, discipline_id
         FROM project_type
         ORDER BY name`,
    );
    return result.rows;
}

async function loadMockAccountIds(database: Database): Promise<string[]> {
    const result = await database.query<{ id: string }>(
        `SELECT id
         FROM user_account
         WHERE keycloak_id LIKE $1
            OR email LIKE $2`,
        [`${mockKeycloakPrefix}%`, `%@${mockEmailDomain}`],
    );
    return result.rows.map((row) => row.id);
}

async function loadMockFiles(database: Database, accountIds: string[]): Promise<string[]> {
    if (accountIds.length === 0) {
        return [];
    }
    const result = await database.query<{ ref: string | null }>(
        `SELECT photo AS ref
         FROM user_account
         WHERE id = ANY($1::varchar[])
         UNION
         SELECT ref
         FROM user_media
         WHERE user_account_id = ANY($1::varchar[])
           AND media_type IN ('photo', 'upload')
         UNION
         SELECT thumbnail AS ref
         FROM user_media
         WHERE user_account_id = ANY($1::varchar[])
           AND thumbnail IS NOT NULL`,
        [accountIds],
    );
    return uniqueUlids(result.rows.map((row) => row.ref));
}

async function deleteMockRows(
    query: <R extends { [key: string]: unknown }>(text: string, values?: unknown[]) => Promise<{ rows: R[] }>,
    accountIds: string[],
): Promise<void> {
    await query(
        `DELETE FROM project_project_type
         WHERE project_id IN (
             SELECT id FROM projects WHERE user_account_id = ANY($1::varchar[])
         )`,
        [accountIds],
    );
    await query(`DELETE FROM projects WHERE user_account_id = ANY($1::varchar[])`, [accountIds]);
    await query(`DELETE FROM user_availability WHERE user_account_id = ANY($1::varchar[])`, [accountIds]);
    await query(`DELETE FROM user_locale WHERE user_account_id = ANY($1::varchar[])`, [accountIds]);
    await query(`DELETE FROM user_media WHERE user_account_id = ANY($1::varchar[])`, [accountIds]);
    await query(`DELETE FROM user_settings WHERE user_account_id = ANY($1::varchar[])`, [accountIds]);
    await query(
        `UPDATE user_account SET viewing_work_profile_id = NULL WHERE id = ANY($1::varchar[])`,
        [accountIds],
    );
    await query(`DELETE FROM user_work_profile WHERE user_account_id = ANY($1::varchar[])`, [accountIds]);
    await query(`DELETE FROM user_account WHERE id = ANY($1::varchar[])`, [accountIds]);
}

async function insertCrew(
    query: <R extends { [key: string]: unknown }>(text: string, values?: unknown[]) => Promise<{ rows: R[] }>,
    draft: CrewDraft,
    profilePhotoId: string,
    galleryPhotoId: string,
): Promise<void> {
    const accountId = ulid();
    const workProfileId = ulid();
    await query(
        `INSERT INTO user_account (
             id, first_name, last_name, email, phone, photo, keycloak_id, status, account_type
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'live', 'crew')`,
        [
            accountId,
            draft.first,
            draft.last,
            draft.email,
            draft.phone,
            profilePhotoId,
            draft.keycloakId,
        ],
    );

    await query(
        `INSERT INTO user_work_profile (
             id, user_account_id, day_rate, currency_id, union_status, flat_fee,
             projects_completed, years_in_business, response_time_hours,
             discipline_id, position_id, bio, title, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'live')`,
        [
            workProfileId,
            accountId,
            draft.dayRate,
            draft.currency.id,
            draft.unionStatus,
            draft.flatFee,
            draft.projectsCompleted,
            draft.years,
            draft.responseHours,
            draft.position.discipline_id,
            draft.position.id,
            draft.bio,
            draft.position.name,
        ],
    );

    await query(
        `UPDATE user_account SET viewing_work_profile_id = $2 WHERE id = $1`,
        [accountId, workProfileId],
    );

    for (const city of draft.cities) {
        await query(
            `INSERT INTO user_locale (id, user_account_id, production_city_id, home_city, user_work_profile_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [ulid(), accountId, city.id, city.id === draft.home.id, workProfileId],
        );
    }

    await query(
        `INSERT INTO user_media (id, user_account_id, media_type, ref, thumbnail, sort_order, status, user_work_profile_id)
         VALUES ($1, $2, 'photo', $3, NULL, 0, NULL, $4)`,
        [ulid(), accountId, galleryPhotoId, workProfileId],
    );
    for (let video = 0; video < draft.videoCount; video += 1) {
        await query(
            `INSERT INTO user_media (id, user_account_id, media_type, ref, thumbnail, sort_order, status, user_work_profile_id)
             VALUES ($1, $2, 'youtube', $3, NULL, $4, NULL, $5)`,
            [ulid(), accountId, youtubeUrl, video + 1, workProfileId],
        );
    }

    for (const project of draft.projects) {
        const projectId = ulid();
        await query(
            `INSERT INTO projects (
                 id, user_account_id, name, position_id, lead_producer_name,
                 lead_producer_email, date, production_company, user_work_profile_id
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                projectId,
                accountId,
                project.name,
                draft.position.id,
                project.producer,
                project.producerEmail,
                project.date,
                project.company,
                workProfileId,
            ],
        );
        for (const typeId of project.typeIds) {
            await query(
                `INSERT INTO project_project_type (project_id, project_type_id)
                 VALUES ($1, $2)`,
                [projectId, typeId],
            );
        }
    }

    for (const block of draft.availability) {
        await query(
            `INSERT INTO user_availability (id, user_account_id, from_date, to_date, code, user_work_profile_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [ulid(), accountId, block.from, block.to, block.code, workProfileId],
        );
    }
}

function assignPositions(positions: Position[], count: number): Position[] {
    if (positions.length >= count) {
        const chosen: Position[] = [];
        for (let index = 0; index < count; index += 1) {
            const source = Math.floor((index * positions.length) / count);
            const position = positions[source];
            if (!position) {
                throw new Error('Position sample missed a row.');
            }
            chosen.push(position);
        }
        return chosen;
    }

    console.warn(`Only ${positions.length} positions exist. Some kinds will repeat to reach ${count}.`);
    return Array.from({ length: count }, (_, index) => {
        const position = positions[index % positions.length];
        if (!position) {
            throw new Error('Position list is empty.');
        }
        return position;
    });
}

function buildCrew(
    index: number,
    position: Position,
    cities: City[],
    currencies: Currency[],
    projectTypes: ProjectType[],
): CrewDraft {
    const serial = String(index + 1).padStart(3, '0');
    const name = crewName(index);
    const home = at(cities, (index * 5 + 2) % cities.length);
    const extraCount = index % 3;
    const travel = pickDistinct(cities, extraCount, index + 11, home.id);
    const currency = currencyFor(home.country_code, currencies);
    const years = 3 + (index % 20);
    const responseHours = at([1, 2, 4, 8, 12, 24], index % 6);
    const videoCount = 1 + (index % 3);
    const projectCount = 2 + (index % 3);
    const projects = Array.from({ length: projectCount }, (_, projectIndex) => {
        const title = at(credits, (index + projectIndex * 3) % credits.length);
        const company = at(companies, (index + projectIndex) % companies.length);
        const producer = at(producers, (index + projectIndex * 2) % producers.length);
        const year = 2017 + ((index + projectIndex) % 9);
        const month = String(((index + projectIndex) % 12) + 1).padStart(2, '0');
        const types = projectTypes.filter((row) => row.discipline_id === position.discipline_id);
        const typeIds = types.length === 0
            ? []
            : [at(types, (index + projectIndex) % types.length).id];
        if (types.length > 1 && projectIndex % 2 === 0) {
            const extra = at(types, (index + projectIndex + 3) % types.length).id;
            if (!typeIds.includes(extra)) {
                typeIds.push(extra);
            }
        }
        return {
            name: projectIndex === 0 ? title : `${title} ${projectIndex + 1}`,
            date: `${year}-${month}-12`,
            company,
            producer,
            producerEmail: `${slug(producer)}@${slug(company)}.example`,
            typeIds,
        };
    });
    const unionStatus = at(['union', 'non_union', 'either'] as const, index % 3);
    const bio = buildBio({
        name: `${name.first} ${name.last}`,
        position: position.name,
        discipline: position.discipline,
        city: home.name,
        years,
        credit: projects[0]?.name ?? 'independent work',
        hours: responseHours,
    });

    return {
        index,
        first: name.first,
        last: name.last,
        email: `${slug(name.first)}.${slug(name.last)}.${serial}@${mockEmailDomain}`,
        phone: `+1 213 555 ${String(1000 + index).padStart(4, '0')}`,
        keycloakId: `${mockKeycloakPrefix}${serial}`,
        position,
        home,
        cities: [home, ...travel],
        currency,
        unionStatus,
        flatFee: index % 4 === 0,
        dayRate: dayRate(index, currency.code),
        years,
        projectsCompleted: projectCount + 6 + (index % 28),
        responseHours,
        bio,
        videoCount,
        projects,
        availability: availability(index),
    };
}

function buildBio(parts: {
    name: string;
    position: string;
    discipline: string;
    city: string;
    years: number;
    credit: string;
    hours: number;
}): string {
    const place = parts.discipline === 'Post Production' ? 'in finishing' : 'on set';
    const role = `${article(parts.position)} ${parts.position}`;
    const reply = parts.hours === 1 ? '1 hour' : `${parts.hours} hours`;
    const full = `${parts.name} is ${role} based in ${parts.city}. ${parts.years} years ${place}, including ${parts.credit}. Available to travel and usually replies within ${reply}.`;
    if (full.length <= 300) {
        return full;
    }
    const shorter = `${parts.name} is ${role} in ${parts.city}. ${parts.years} years of credits, including ${parts.credit}.`;
    if (shorter.length <= 300) {
        return shorter;
    }
    return shorter.slice(0, 300);
}

function availability(index: number): CrewDraft['availability'] {
    const blocks = index % 4;
    if (blocks === 0) {
        return [];
    }
    const today = new Date();
    const start = 14 + (index % 40);
    const rows: CrewDraft['availability'] = [];
    for (let block = 0; block < blocks; block += 1) {
        const from = start + block * 21;
        rows.push({
            from: addDays(today, from),
            to: addDays(today, from + 4 + (block % 3)),
            code: block % 2 === 0 ? 'booked' : 'unavailable',
        });
    }
    return rows;
}

function dayRate(index: number, currency: string): number {
    const usd = 400 + ((index * 73) % 28) * 50;
    if (currency === 'JPY') {
        return usd * 150;
    }
    if (currency === 'CNY') {
        return usd * 7;
    }
    if (currency === 'GBP') {
        return Math.round(usd * 0.8);
    }
    if (currency === 'EUR') {
        return Math.round(usd * 0.9);
    }
    return usd;
}

function currencyFor(country: string, currencies: Currency[]): Currency {
    const code = country === 'GB'
        ? 'GBP'
        : country === 'JP'
            ? 'JPY'
            : country === 'CN' || country === 'HK'
                ? 'CNY'
                : euroCountries.has(country)
                    ? 'EUR'
                    : 'USD';
    return currencies.find((row) => row.code === code)
        ?? currencies.find((row) => row.code === 'USD')
        ?? at(currencies, 0);
}

function crewName(index: number): { first: string; last: string } {
    return {
        first: at(firstNames, index % firstNames.length),
        last: at(lastNames, (index * 7 + Math.floor(index / firstNames.length)) % lastNames.length),
    };
}

function pickDistinct(cities: City[], count: number, start: number, homeId: string): City[] {
    const chosen: City[] = [];
    for (let step = 0; chosen.length < count && step < cities.length; step += 1) {
        const city = cities[(start + step) % cities.length];
        if (city && city.id !== homeId && !chosen.some((row) => row.id === city.id)) {
            chosen.push(city);
        }
    }
    return chosen;
}

async function ensureProfilePhotos(count: number): Promise<Buffer[]> {
    await mkdir(profileDir, { recursive: true });
    return mapPool(Array.from({ length: count }, (_, index) => index), 8, async (index) => {
        const file = path.join(profileDir, `${String(index + 1).padStart(3, '0')}.jpg`);
        const cached = await readFile(file).catch(() => null);
        if (cached && isJpeg(cached)) {
            return cached;
        }
        const gender = index % 2 === 0 ? 'men' : 'women';
        const portrait = Math.floor(index / 2);
        const url = `https://randomuser.me/api/portraits/${gender}/${portrait}.jpg`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Could not download ${url} (${response.status}).`);
        }
        const bytes = Buffer.from(await response.arrayBuffer());
        if (!isJpeg(bytes)) {
            throw new Error(`Downloaded portrait is not a JPEG: ${url}`);
        }
        await writeFile(file, bytes);
        return bytes;
    });
}

function isJpeg(data: Uint8Array): boolean {
    return data.byteLength >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}

async function removeFiles(binary: Binary, ids: string[]): Promise<void> {
    const unique = uniqueUlids(ids);
    await mapPool(unique, 8, async (id) => {
        try {
            await binary.remove(id);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Could not remove stored file ${id}: ${message}`);
        }
    });
}

function uniqueUlids(ids: Array<string | null | undefined>): string[] {
    return [...new Set(ids.filter((id): id is string => typeof id === 'string' && ulidPattern.test(id)))];
}

async function mapPool<T, R>(
    items: readonly T[],
    limit: number,
    run: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const index = next;
            next += 1;
            const item = items[index];
            if (item !== undefined) {
                results[index] = await run(item, index);
            }
        }
    });
    await Promise.all(workers);
    return results;
}

function at<T>(items: readonly T[], index: number): T {
    const item = items[index];
    if (item === undefined) {
        throw new Error(`Missing list item ${index}.`);
    }
    return item;
}

function article(word: string): 'a' | 'an' {
    return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 40);
}

function addDays(base: Date, days: number): string {
    const copy = new Date(base);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy.toISOString().slice(0, 10);
}

function countBy<T>(items: readonly T[], key: (item: T) => string): Map<string, number> {
    const counts = new Map<string, number>();
    for (const item of items) {
        const name = key(item);
        counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
}

function formatCounts(counts: Map<string, number>): string {
    return [...counts.entries()].map(([name, count]) => `${count} ${name}`).join(', ');
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});

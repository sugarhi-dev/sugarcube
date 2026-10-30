import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Config, Database } from '@sugarcube/server-core';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(serverRoot, 'config/local/.env');
const migrationsDir = path.join(serverRoot, 'db');

async function start(): Promise<void> {
    const config = new Config(envPath);
    const database = new Database(config);
    try {
        await runMigrations(database);
    } finally {
        await database.close();
    }
}

async function runMigrations(database: Database): Promise<void> {
    const files = (await readdir(migrationsDir))
        .filter((name) => name.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const applied = await loadApplied(database);
    let count = 0;

    for (const name of files) {
        if (applied.has(name)) {
            continue;
        }

        const data = await readFile(path.join(migrationsDir, name), 'utf8');
        await database.transaction(async (query) => {
            await query(data);
            await query('INSERT INTO migration (name, data) VALUES ($1, $2)', [name, data]);
        });
        count += 1;
        console.log(`applied ${name}`);
    }

    if (count === 0) {
        console.log('migrations up to date');
    }
}

async function loadApplied(database: Database): Promise<Set<string>> {
    const exists = await database.query<{ exists: boolean }>(
        `SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'migration'
        ) AS exists`,
    );

    if (!exists.rows[0]?.exists) {
        return new Set();
    }

    const result = await database.query<{ name: string }>('SELECT name FROM migration');
    return new Set(result.rows.map((row) => row.name));
}

start().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});

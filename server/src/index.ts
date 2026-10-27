import { config as loadEnv } from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Database } from '@sugarcube/server-core';
import { ApiService } from './services/apiService.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function start(): Promise<void> {
    const loaded = loadEnv({ path: path.join(serverRoot, 'config/local/.env'), quiet: true });
    if (loaded.error) {
        throw loaded.error;
    }

    const app = express();
    app.use(express.json());
    const database = new Database();
    const apiService = new ApiService(app, database);
    await apiService.start();

    const port = Number(process.env.PORT ?? 3000);
    app.listen(port);
}

start();

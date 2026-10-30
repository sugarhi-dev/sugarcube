import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Config, Database } from '@sugarcube/server-core';
import { ApiService } from './services/apiService.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const requiredEnv = [
    'DATABASE_URL',
    'S3_ENDPOINT',
    'S3_BUCKET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'OAUTH_CLIENT_ID',
    'OAUTH_CLIENT_SECRET',
    'KEYCLOAK_ISSUER',
    'KEYCLOAK_JWKS_URL',
] as const;

async function start(): Promise<void> {
    const config = new Config(path.join(serverRoot, 'config/local/.env'));
    config.requireAll(requiredEnv);

    const app = express();
    app.use(express.json());
    const database = new Database(config);
    const apiService = new ApiService(config, app, database);
    await apiService.start();

    const port = Number(config.optional('PORT', '3000'));
    app.listen(port);
}

start();

import { config as loadEnv } from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthController } from './controllers/authcontroller.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function start(): void {
    const loaded = loadEnv({ path: path.join(serverRoot, 'config/local/.env'), quiet: true });
    if (loaded.error) {
        throw loaded.error;
    }

    const app = express();
    new AuthController(app);

    const port = Number(process.env.PORT ?? 3000);
    app.listen(port);
}

start();

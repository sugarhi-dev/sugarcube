import { existsSync } from 'node:fs';
import path from 'node:path';

export function resolveEnvFile(serverRoot: string): string {
    if (process.env.ENV_FILE) {
        return process.env.ENV_FILE;
    }

    for (const candidate of [
        path.join(serverRoot, '.env'),
        '/.env',
        path.join(serverRoot, 'config/local/.env'),
    ]) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    return path.join(serverRoot, 'config/local/.env');
}

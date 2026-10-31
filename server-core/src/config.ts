import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { exit } from 'process';
import { Logger, type ILogObj } from 'tslog';

export class Config {
    private readonly log = new Logger<ILogObj>();

    constructor(envFile?: string) {
        if (envFile && !existsSync(envFile)) {
            // Container/runtime env can supply process.env without a dotenv file.
            return;
        }

        const loaded = dotenv.config({ path: envFile, quiet: true });
        if (loaded.error) {
            this.log.fatal(loaded.error.message);
            throw loaded.error;
        }
    }

    public require(key: string): string {
        const value = process.env[key];
        if (!value) {
            this.log.fatal(`Environment variable ${key} is required.`);
            exit(-1);
        }
        return value;
    }

    public requireAll(keys: readonly string[]): void {
        const missing = keys.filter((key) => !process.env[key]);
        if (missing.length === 0) {
            return;
        }
        for (const key of missing) {
            this.log.fatal(`Environment variable ${key} is required.`);
        }
        exit(-1);
    }

    public get(key: string): string {
        const value = process.env[key];
        if (!value) {
            const message = `Environment variable ${key} is not set`;
            this.log.error(message);
            throw new Error(message);
        }
        return value;
    }

    public optional(key: string, fallback: string): string {
        const value = process.env[key];
        if (!value) {
            return fallback;
        }
        return value;
    }
}

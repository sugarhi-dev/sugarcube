import { Logger, type ILogObj } from 'tslog';

export class Base {
    private readonly logger: Logger<ILogObj>;

    constructor() {
        this.logger = new Logger<ILogObj>();
    }
}

export { Controller } from './controller.js';
export { Database } from './database.js';   
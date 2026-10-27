import { Logger, type ILogObj } from 'tslog';

export class Base {
    protected readonly log: Logger<ILogObj>;

    constructor() {
        this.log = new Logger<ILogObj>();
    }
}   
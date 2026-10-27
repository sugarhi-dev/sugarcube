import { Base } from './base.js';

export class Service extends Base {
    protected name: string;

    constructor(name: string)
    {
        super();
        this.name = name;
    }

    protected beforeStart() : Promise<void>
    {
        return Promise.resolve();
    }

    public async start() : Promise<void>
    {   
        this.log.info(`${this.name} starting...`);
        await this.beforeStart();
        this.log.info(`${this.name} started`);
    }

    protected async beforeStop() : Promise<void>
    {
        return Promise.resolve();
    }

    public async stop() : Promise<void>
    {
        this.log.info(`${this.name} stopping...`);
        await this.beforeStop();
        this.log.info(`${this.name} stopped`);
    }

}

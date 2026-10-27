import { Base } from './base.js';
import { Database } from './database.js';

export class Repository extends Base {
    protected readonly database: Database;

    constructor(database: Database) {
        super();
        this.database = database;
    }    
}
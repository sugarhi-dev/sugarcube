import { Controller, type Context } from '@sugarcube/server-core';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { CurrencyLogic } from '../logic/currencyLogic.js';

const CurrencyIdSchema = z.ulid().meta({ description: 'Currency id.' });

export const currencyRequestSchemas = { CurrencyId: CurrencyIdSchema };

export class CurrencyController extends Controller {
    private readonly currencyLogic: CurrencyLogic;

    constructor(app: Express, currencyLogic: CurrencyLogic) {
        super(app);
        this.currencyLogic = currencyLogic;
        this.get('/api/currencies', this.GET_currencies.bind(this));
        this.get('/api/currencies/:id', this.GET_currency.bind(this));
    }

    protected async GET_currencies(ctx: Context, _req: Request, res: Response): Promise<void> {
        const currencies = await this.currencyLogic.listCurrencies(ctx);
        this.checkAndRespond(ctx, res, currencies);
    }

    protected async GET_currency(ctx: Context, req: Request, res: Response): Promise<void> {
        const id = CurrencyIdSchema.parse(req.params.id);
        const currency = await this.currencyLogic.getCurrency(ctx, id);
        this.checkAndRespond(ctx, res, currency);
    }
}

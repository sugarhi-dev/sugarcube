import { Context, Logic } from '@sugarcube/server-core';
import type { Currency } from '../entities/currency.js';
import { CurrencyRepo } from '../repositories/currencyRepo.js';

export class CurrencyLogic extends Logic {
    private readonly currencyRepo: CurrencyRepo;

    constructor(currencyRepo: CurrencyRepo) {
        super();
        this.currencyRepo = currencyRepo;
    }

    listCurrencies(ctx: Context): Promise<Currency[]> {
        return this.currencyRepo.listCurrencies(ctx);
    }

    async getCurrency(ctx: Context, id: string): Promise<Currency | null> {
        const currency = await this.currencyRepo.findCurrencyById(ctx, id);
        if (!currency) {
            ctx.error('Currency not found.', 404);
            return null;
        }
        return currency;
    }
}

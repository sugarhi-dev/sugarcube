import { z } from 'zod';

export const CurrencySchema = z.object({
    id: z.ulid(),
    code: z.string().regex(/^[A-Z]{3}$/),
    name: z.string().min(1).max(255),
});

export type Currency = z.infer<typeof CurrencySchema>;

import { z } from 'zod';

export const ProductionCitySchema = z.object({
    id: z.ulid(),
    name: z.string().min(1).max(255),
    country_code: z.string().regex(/^[A-Z]{2}$/),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
});

export type ProductionCity = z.infer<typeof ProductionCitySchema>;

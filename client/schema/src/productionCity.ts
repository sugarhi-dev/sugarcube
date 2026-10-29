import { z } from 'zod';

// City list the browser may keep. Coordinates stay on the server entity.
export const ProductionCitySchema = z.object({
    id: z.ulid(),
    name: z.string().min(1).max(255),
    country_code: z.string().regex(/^[A-Z]{2}$/),
}).strip();

export type ProductionCity = z.infer<typeof ProductionCitySchema>;

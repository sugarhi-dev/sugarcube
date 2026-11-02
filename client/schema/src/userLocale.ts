import { z } from 'zod';

// City the browser may keep. The owner stays on the server entity.
export const UserLocaleSchema = z.object({
    id: z.ulid(),
    production_city_id: z.ulid(),
    home_city: z.boolean(),
}).strip();

export type UserLocale = z.infer<typeof UserLocaleSchema>;

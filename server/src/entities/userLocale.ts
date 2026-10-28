import { z } from 'zod';

export const UserLocaleSchema = z.object({
    id: z.ulid(),
    user_profile_id: z.ulid(),
    production_city_id: z.ulid(),
    home_city: z.boolean().default(false),
});

export type UserLocale = z.infer<typeof UserLocaleSchema>;

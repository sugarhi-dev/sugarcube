import { z } from 'zod';

export const WorkProfileSchema = z.object({
    id: z.ulid(),
    user_profile_id: z.ulid(),
    discipline_id: z.ulid(),
    position_id: z.ulid(),
});

export type WorkProfile = z.infer<typeof WorkProfileSchema>;

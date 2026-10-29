import { z } from 'zod';

export const ProjectSchema = z.object({
    id: z.ulid(),
    user_profile_id: z.ulid(),
    name: z.string().min(1).max(255),
    position_id: z.ulid(),
    lead_producer_name: z.string().min(1),
}).strip();

export type Project = z.infer<typeof ProjectSchema>;

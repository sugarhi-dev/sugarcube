import { z } from 'zod';

export const ProjectTypeSchema = z.object({
    id: z.ulid(),
    discipline_id: z.ulid(),
    name: z.string().min(1).max(255),
}).strip();

export type ProjectType = z.infer<typeof ProjectTypeSchema>;

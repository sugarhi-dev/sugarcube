import { z } from 'zod';

export const ProjectProjectTypeSchema = z.object({
    project_id: z.ulid(),
    project_type_id: z.ulid(),
}).strip();

export type ProjectProjectType = z.infer<typeof ProjectProjectTypeSchema>;

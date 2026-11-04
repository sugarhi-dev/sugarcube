import { z } from 'zod';

// Credit the browser may keep. The owner foreign key stays on the server entity.
export const ProjectSchema = z.object({
    id: z.ulid(),
    name: z.string().min(1).max(255),
    position_id: z.ulid(),
    lead_producer_name: z.string().min(1),
    date: z.iso.date(),
    production_company: z.string().min(1).nullable(),
    hiring_producer: z.string().min(1).nullable(),
}).strip();

export type Project = z.infer<typeof ProjectSchema>;

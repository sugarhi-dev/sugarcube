import { z } from 'zod';

export const DisciplineSchema = z.object({
    id: z.ulid(),
    name: z.string().min(1).max(255),
}).strip();

export type Discipline = z.infer<typeof DisciplineSchema>;

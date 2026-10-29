import { z } from 'zod';

export const PositionSchema = z.object({
    id: z.ulid(),
    discipline_id: z.ulid(),
    name: z.string().min(1).max(255),
}).strip();

export type Position = z.infer<typeof PositionSchema>;

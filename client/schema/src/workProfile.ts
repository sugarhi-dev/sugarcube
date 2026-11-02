import { z } from 'zod';

// Position the browser may keep. The owner stays on the server entity.
export const WorkProfileSchema = z.object({
    id: z.ulid(),
    discipline_id: z.ulid(),
    position_id: z.ulid(),
}).strip();

export type WorkProfile = z.infer<typeof WorkProfileSchema>;

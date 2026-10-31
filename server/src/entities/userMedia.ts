import { z } from 'zod';

export const MediaTypeSchema = z.enum(['youtube', 'vimeo', 'upload']);

export const UserMediaSchema = z.object({
    id: z.ulid(),
    user_profile_id: z.ulid(),
    media_type: MediaTypeSchema,
    ref: z.string().min(1).max(2048),
    thumbnail: z.ulid().nullable().default(null),
    sort_order: z.number().int().nonnegative(),
}).strip();

export type UserMedia = z.infer<typeof UserMediaSchema>;

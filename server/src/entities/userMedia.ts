import { z } from 'zod';

export const MediaTypeSchema = z.enum(['youtube', 'vimeo', 'upload', 'photo']);

export const UserMediaStatusSchema = z.enum(['pending', 'ready']);

export const UserMediaSchema = z.object({
    id: z.ulid(),
    user_account_id: z.ulid(),
    media_type: MediaTypeSchema,
    ref: z.string().min(1).max(2048),
    thumbnail: z.ulid().nullable().default(null),
    sort_order: z.number().int().nonnegative(),
    status: UserMediaStatusSchema.nullable().default(null),
    stream_url: z.string().min(1).max(2048).nullable().default(null),
}).strip();

export type UserMedia = z.infer<typeof UserMediaSchema>;

import { z } from 'zod';

export const ProfilePhotoUrlSchema = z.object({
    url: z.string().regex(/^https:\/\/[^/]+\/.+/),
    expires_in: z.number().int().positive(),
}).strip();

export type ProfilePhotoUrl = z.infer<typeof ProfilePhotoUrlSchema>;

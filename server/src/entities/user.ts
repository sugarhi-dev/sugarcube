import { z } from 'zod';

export const UserSchema = z.object({
    id: z.ulid(),
    first_name: z.string().max(255),
    last_name: z.string().max(255),
    email: z.email().max(255),
    keycloak_id: z.string().min(1).max(255),
});

export type User = z.infer<typeof UserSchema>;

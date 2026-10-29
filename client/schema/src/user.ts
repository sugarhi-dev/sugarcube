import { z } from 'zod';

export const UserStatusSchema = z.enum([
    'new',
    'setup',
    'experience',
    'media',
    'review',
    'live',
    'invisible',
]);

export type UserStatus = z.infer<typeof UserStatusSchema>;

export const AccountTypeSchema = z.enum(['client', 'crew']);

export type AccountType = z.infer<typeof AccountTypeSchema>;

// Profile the browser may keep. The identity-provider subject stays on the server entity.
export const CurrentUserSchema = z.object({
    id: z.ulid(),
    first_name: z.string().max(255),
    last_name: z.string().max(255),
    email: z.email().max(255),
    phone: z.string().nullable(),
    status: UserStatusSchema,
    account_type: AccountTypeSchema.nullable(),
}).strip();

export type CurrentUser = z.infer<typeof CurrentUserSchema>;

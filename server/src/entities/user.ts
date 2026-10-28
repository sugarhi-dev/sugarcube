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

export const UserSchema = z.object({
    id: z.ulid(),
    first_name: z.string().max(255),
    last_name: z.string().max(255),
    email: z.email().max(255),
    phone: z.string().nullable().default(null),
    keycloak_id: z.string().min(1).max(255),
    status: UserStatusSchema.default('new'),
    account_type: AccountTypeSchema.nullable().default(null),
});

export type User = z.infer<typeof UserSchema>;

import { z } from 'zod';
import { AccountTypeSchema, CurrentUserSchema, UserStatusSchema } from '@sugarcube/schema';

export const UserSchema = CurrentUserSchema.extend({
    keycloak_id: z.string().min(1).max(255),
    phone: z.string().nullable().default(null),
    status: UserStatusSchema.default('new'),
    account_type: AccountTypeSchema.nullable().default(null),
});

export type User = z.infer<typeof UserSchema>;

type Expect<T extends true> = T;
type _currentUserIsPublicSubset = Expect<User extends z.infer<typeof CurrentUserSchema> ? true : never>;

export { AccountTypeSchema, UserStatusSchema };
export type { AccountType, UserStatus } from '@sugarcube/schema';

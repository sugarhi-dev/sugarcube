import { z } from 'zod';

export const UnionStatusSchema = z.enum(['union', 'non_union', 'either']);

export type UnionStatus = z.infer<typeof UnionStatusSchema>;

export const UserWorkProfileSchema = z.object({
    id: z.ulid(),
    user_profile_id: z.ulid(),
    day_rate: z.number().min(0).nullable().default(null),
    currency_id: z.ulid().nullable().default(null),
    union_status: UnionStatusSchema,
    flat_fee: z.boolean().default(false),
}).refine(
    (row) => (row.day_rate === null) === (row.currency_id === null),
    'day_rate and currency_id must both be set or both be null',
);

export type UserWorkProfile = z.infer<typeof UserWorkProfileSchema>;

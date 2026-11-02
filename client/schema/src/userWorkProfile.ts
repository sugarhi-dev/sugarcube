import { z } from 'zod';

export const UnionStatusSchema = z.enum(['union', 'non_union', 'either']);

export type UnionStatus = z.infer<typeof UnionStatusSchema>;

// Rates the browser may keep. The owner stays on the server entity.
export const UserWorkProfileSchema = z.object({
    id: z.ulid(),
    day_rate: z.number().min(0).nullable(),
    currency_id: z.ulid().nullable(),
    union_status: UnionStatusSchema,
    flat_fee: z.boolean(),
}).strip().refine(
    (row) => (row.day_rate === null) === (row.currency_id === null),
    'day_rate and currency_id must both be set or both be null',
);

export type UserWorkProfile = z.infer<typeof UserWorkProfileSchema>;

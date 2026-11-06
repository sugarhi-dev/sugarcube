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
    projects_completed: z.number().int().min(0).nullable(),
    years_in_business: z.number().int().min(0).nullable(),
    response_time_hours: z.number().int().min(1).nullable(),
}).strip().refine(
    (row) => (row.day_rate === null) === (row.currency_id === null),
    'day_rate and currency_id must both be set or both be null',
);

export type UserWorkProfile = z.infer<typeof UserWorkProfileSchema>;

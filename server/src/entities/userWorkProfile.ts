import { z } from 'zod';

export const UnionStatusSchema = z.enum(['union', 'non_union', 'either']);

export type UnionStatus = z.infer<typeof UnionStatusSchema>;

export const WorkProfileStatusSchema = z.enum(['draft', 'admin-review', 'live']);

export type WorkProfileStatus = z.infer<typeof WorkProfileStatusSchema>;

export const WorkProfileChoiceSchema = z.object({
    id: z.ulid(),
    status: WorkProfileStatusSchema,
    title: z.string().nullable(),
    position: z.string().nullable(),
    city: z.string().nullable(),
}).strip();

export type WorkProfileChoice = z.infer<typeof WorkProfileChoiceSchema>;

export const UserWorkProfileSchema = z.object({
    id: z.ulid(),
    user_account_id: z.ulid(),
    day_rate: z.number().min(0).nullable().default(null),
    currency_id: z.ulid().nullable().default(null),
    union_status: UnionStatusSchema,
    flat_fee: z.boolean().default(false),
    projects_completed: z.number().int().min(0).nullable().default(null),
    years_in_business: z.number().int().min(0).nullable().default(null),
    response_time_hours: z.number().int().min(1).nullable().default(null),
    discipline_id: z.ulid().nullable().default(null),
    position_id: z.ulid().nullable().default(null),
    bio: z.string().max(300).nullable().default(null),
    title: z.string().max(120).nullable().default(null),
    status: WorkProfileStatusSchema.default('draft'),
}).refine(
    (row) => (row.day_rate === null) === (row.currency_id === null),
    'day_rate and currency_id must both be set or both be null',
).refine(
    (row) => (row.discipline_id === null) === (row.position_id === null),
    'discipline_id and position_id must both be set or both be null',
);

export type UserWorkProfile = z.infer<typeof UserWorkProfileSchema>;

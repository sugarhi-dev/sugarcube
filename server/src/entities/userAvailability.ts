import { z } from 'zod';

export const AvailabilityCodeSchema = z.enum(['unavailable', 'booked']);

export type AvailabilityCode = z.infer<typeof AvailabilityCodeSchema>;

export const UserAvailabilitySchema = z.object({
    id: z.ulid(),
    user_account_id: z.ulid(),
    from_date: z.iso.date(),
    to_date: z.iso.date(),
    code: AvailabilityCodeSchema,
}).refine(
    (row) => row.to_date >= row.from_date,
    'to_date must be on or after from_date',
);

export type UserAvailability = z.infer<typeof UserAvailabilitySchema>;

export const ProfileUnavailabilitySchema = z.object({
    id: z.ulid(),
    from_date: z.iso.date(),
    to_date: z.iso.date(),
    work_profile_id: z.ulid(),
    title: z.string().nullable(),
    position: z.string().nullable(),
    city: z.string().nullable(),
    code: AvailabilityCodeSchema,
}).refine(
    (row) => row.to_date >= row.from_date,
    'to_date must be on or after from_date',
);

export type ProfileUnavailability = z.infer<typeof ProfileUnavailabilitySchema>;

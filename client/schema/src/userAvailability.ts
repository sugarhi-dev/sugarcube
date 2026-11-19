import { z } from 'zod';

export const AvailabilityCodeSchema = z.enum(['unavailable', 'booked']);

export type AvailabilityCode = z.infer<typeof AvailabilityCodeSchema>;

// Date range the browser may keep. The owner stays on the server entity.
export const UserAvailabilitySchema = z.object({
    id: z.ulid(),
    from_date: z.iso.date(),
    to_date: z.iso.date(),
    code: AvailabilityCodeSchema,
}).strip().refine(
    (row) => row.to_date >= row.from_date,
    'to_date must be on or after from_date',
);

export type UserAvailability = z.infer<typeof UserAvailabilitySchema>;

// Unavailable range across the account, with the work profile it belongs to.
export const ProfileUnavailabilitySchema = z.object({
    id: z.ulid(),
    from_date: z.iso.date(),
    to_date: z.iso.date(),
    work_profile_id: z.ulid(),
    title: z.string().nullable(),
    position: z.string().nullable(),
    city: z.string().nullable(),
    code: AvailabilityCodeSchema,
}).strip().refine(
    (row) => row.to_date >= row.from_date,
    'to_date must be on or after from_date',
);

export type ProfileUnavailability = z.infer<typeof ProfileUnavailabilitySchema>;

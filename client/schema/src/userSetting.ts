import { z } from 'zod';

export const additionalSettingNames = [
    'company',
    'role',
    'company_type',
    'website',
    'instagram',
    'vimeo',
    'language',
] as const;

export const notificationSettingNames = [
    'notify_booking_email',
    'notify_booking_push',
    'notify_messages_email',
    'notify_messages_push',
    'notify_receipts_email',
    'notify_receipts_push',
    'notify_reminders_email',
    'notify_reminders_push',
    'notify_tips_email',
    'notify_tips_push',
] as const;

export const userSettingNames = [
    ...additionalSettingNames,
    ...notificationSettingNames,
] as const;

export const UserSettingNameSchema = z.enum(userSettingNames);

export type UserSettingName = z.infer<typeof UserSettingNameSchema>;

export const userSettingRoles = [
    'Owner / Executive Producer',
    'Producer',
    'Director',
    'Production Manager',
    'Agency Producer',
    'Brand Producer',
] as const;

export const userSettingCompanyTypes = [
    'Production Company',
    'Agency',
    'Brand',
    'Studio',
    'Freelance',
] as const;

export const userSettingLanguages = [
    'English (US)',
    'English (UK)',
    'Spanish',
    'Spanish (Mexico)',
    'French',
    'Portuguese',
] as const;

// Additional setting the browser may keep. The owner stays on the server entity.
export const UserSettingSchema = z.object({
    id: z.ulid(),
    name: z.string().min(1).max(64),
    value: z.string().min(1).max(255),
}).strip();

export type UserSetting = z.infer<typeof UserSettingSchema>;

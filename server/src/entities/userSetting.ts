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

export const UserSettingSchema = z.object({
    id: z.ulid(),
    user_account_id: z.ulid(),
    name: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
    value: z.string().trim().min(1).max(255),
});

export type UserSetting = z.infer<typeof UserSettingSchema>;

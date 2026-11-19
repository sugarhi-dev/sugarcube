export const settingsPath = '/settings';

export const settingsSections = [
    'personal',
    'additional',
    'payments',
    'notifications',
    'security',
    'subscription',
] as const;

export type SettingsSection = typeof settingsSections[number];

const sectionTitles: Record<SettingsSection, string> = {
    personal: 'Personal Info',
    additional: 'Additional Info',
    payments: 'Payments & Billing',
    notifications: 'Notifications',
    security: 'Account & Security',
    subscription: 'Subscription',
};

export function isSettingsSection(value: string): value is SettingsSection {
    return (settingsSections as readonly string[]).includes(value);
}

export function settingsSectionPath(section: SettingsSection): string {
    return `${settingsPath}/${section}`;
}

export function settingsSectionTitle(section: SettingsSection): string {
    return sectionTitles[section];
}

export function onSettingsPath(pathname: string): boolean {
    return pathname === settingsPath || pathname.startsWith(`${settingsPath}/`);
}

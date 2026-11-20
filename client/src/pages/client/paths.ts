export const clientAccountPath = '/onboarding/client';
export const clientHomePath = '/client';
export const clientSettingsPath = '/client/settings';

export const clientSettingsSections = [
    'profile',
    'company',
    'payments',
    'notifications',
    'security',
    'verification',
] as const;

export type ClientSettingsSection = typeof clientSettingsSections[number];

const sectionTitles: Record<ClientSettingsSection, string> = {
    profile: 'Profile',
    company: 'Company & team',
    payments: 'Payments & billing',
    notifications: 'Notifications & preferences',
    security: 'Security',
    verification: 'Verification',
};

export function isClientSettingsSection(value: string): value is ClientSettingsSection {
    return (clientSettingsSections as readonly string[]).includes(value);
}

export function clientSettingsSectionPath(section: ClientSettingsSection): string {
    return `${clientSettingsPath}/${section}`;
}

export function clientSettingsSectionTitle(section: ClientSettingsSection): string {
    return sectionTitles[section];
}

export function onClientSettingsPath(pathname: string): boolean {
    return pathname === clientSettingsPath || pathname.startsWith(`${clientSettingsPath}/`);
}

import type { Currency, Project, ProjectType, UserAvailability, UserMedia } from '@sugarcube/schema';
import type { Discipline, Position, ProductionCity } from '../../api/catalog.ts';
import type { SetupCity, UnionStatus } from '../../api/me.ts';

export const minimumMedia = 2;
export const disciplineOrder = ['Shooting', 'Post Production'];

export const unionOptions: Array<{ value: UnionStatus; label: string }> = [
    { value: 'union', label: 'Union' },
    { value: 'non_union', label: 'Non-Union' },
    { value: 'either', label: 'Either' },
];

export const unionLabels: Record<UnionStatus, string> = {
    union: 'Union',
    non_union: 'Non-Union',
    either: 'Either',
};

export const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
};

export type ReviewData = {
    media: UserMedia[];
    projects: Project[];
    projectTypes: ProjectType[];
    disciplines: Discipline[];
    positions: Position[];
    currencies: Currency[];
    cities: ProductionCity[];
    disciplineId: string;
    positionId: string;
    unionStatus: UnionStatus;
    dayRate: number | null;
    currencyId: string | null;
    flatFee: boolean;
    projectsCompleted: number | null;
    yearsInBusiness: number | null;
    responseTimeHours: number | null;
    locales: SetupCity[];
    availability: UserAvailability[];
    bio: string | null;
    title: string | null;
};

export type ProfileEditValues = {
    phone: string;
    title: string;
    bio: string;
    discipline_id: string;
    position_id: string;
    day_rate: number | string | null;
    currency_id: string;
    union_status: UnionStatus;
    flat_fee: boolean;
    locales: SetupCity[];
};

export function orderNamed<T extends { name: string }>(rows: T[], preferred: string[]): T[] {
    return [...rows].sort((left, right) => {
        const leftRank = rank(preferred, left.name);
        const rightRank = rank(preferred, right.name);
        if (leftRank !== rightRank) {
            return leftRank - rightRank;
        }
        return left.name.localeCompare(right.name);
    });
}

function rank(order: string[], name: string): number {
    const index = order.indexOf(name);
    return index === -1 ? order.length : index;
}

export function workedOn(names: string[]): string | null {
    const only = names[0];
    if (!only) {
        return null;
    }
    if (names.length === 1) {
        return `Worked on ${only}.`;
    }
    const shown = names.slice(0, 3);
    const last = shown[shown.length - 1];
    const lead = shown.slice(0, -1).join(', ');
    if (!last) {
        return `Worked on ${only}.`;
    }
    if (names.length > 3) {
        return `Worked on ${lead}, ${last} and more.`;
    }
    return `Worked on ${lead} and ${last}.`;
}

export function cityLine(locales: SetupCity[], cities: ProductionCity[]): string | null {
    const home = locales.find((locale) => locale.home_city) ?? locales[0];
    if (!home) {
        return null;
    }
    const nameOf = (id: string) => cities.find((city) => city.id === id)?.name;
    const homeName = nameOf(home.production_city_id);
    if (!homeName) {
        return null;
    }
    const others = locales
        .filter((locale) => locale !== home)
        .flatMap((locale) => {
            const name = nameOf(locale.production_city_id);
            return name ? [name] : [];
        });
    return [`Local in ${homeName}`, ...others].join(' · ');
}

export function formatPerDay(amount: number | null, currency: Currency | undefined): string | null {
    if (amount === null) {
        return null;
    }
    const digits = Number.isInteger(amount) ? 0 : 2;
    const formatted = amount.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
    const symbol = currency ? currencySymbols[currency.code] : undefined;
    const money = symbol ? `${symbol}${formatted}` : currency ? `${formatted} ${currency.code}` : formatted;
    return `${money} per day`;
}

export function readRate(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value.replace(/,/g, ''));
        if (Number.isFinite(parsed) && parsed >= 0) {
            return parsed;
        }
    }
    return null;
}

export function countLabel(value: number | null): string {
    return value === null ? '—' : String(value);
}

export function responseLabel(hours: number | null): string {
    return hours === null ? '—' : `Under ${hours} hours`;
}

export function initials(first: string, last: string): string {
    return `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase() || '?';
}

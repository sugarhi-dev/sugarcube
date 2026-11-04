import { Context, Logic } from '@sugarcube/server-core';
import { ulid } from 'ulidx';
import type { UserAvailability } from '../entities/userAvailability.js';
import { UserAvailabilityRepo } from '../repositories/userAvailabilityRepo.js';
import { constraintFailure } from './pgError.js';

const rangeLimit = 3660;

const availabilityConstraints = {
    user_availability_user_profile_id_fkey: { statusCode: 404, message: 'Profile not found.' },
    user_availability_code_check: { statusCode: 400, message: 'Availability is not allowed.' },
    user_availability_date_range_check: { statusCode: 400, message: 'The end date must be on or after the start date.' },
};

export class UserAvailabilityLogic extends Logic {
    private readonly userAvailabilityRepo: UserAvailabilityRepo;

    constructor(userAvailabilityRepo: UserAvailabilityRepo) {
        super();
        this.userAvailabilityRepo = userAvailabilityRepo;
    }

    listUserAvailability(ctx: Context, userProfileId: string): Promise<UserAvailability[]> {
        return this.userAvailabilityRepo.listUserAvailability(ctx, userProfileId);
    }

    async saveUnavailable(ctx: Context, userProfileId: string, dates: string[]): Promise<UserAvailability[] | null> {
        const unique = [...new Set(dates)].sort();
        if (unique.length > rangeLimit) {
            ctx.error('Choose fewer days.', 400);
            return null;
        }

        const current = await this.userAvailabilityRepo.listUserAvailability(ctx, userProfileId);
        const booked = bookedDays(current);
        if (unique.some((date) => booked.has(date))) {
            ctx.error('Booked days stay booked.', 409);
            return null;
        }

        const ranges = mergeDates(unique).map((range) => ({ id: ulid(), ...range }));
        try {
            return await this.userAvailabilityRepo.replaceUnavailable(ctx, userProfileId, ranges);
        } catch (error) {
            const failure = constraintFailure(error, availabilityConstraints);
            if (!failure) {
                throw error;
            }
            ctx.error(failure.message, failure.statusCode);
            return null;
        }
    }
}

function bookedDays(rows: UserAvailability[]): Set<string> {
    const days = new Set<string>();
    for (const row of rows) {
        if (row.code !== 'booked') {
            continue;
        }
        let cursor = row.from_date;
        for (let count = 0; count < rangeLimit && cursor <= row.to_date; count += 1) {
            days.add(cursor);
            cursor = addDays(cursor, 1);
        }
    }
    return days;
}

function mergeDates(dates: string[]): Array<{ from_date: string; to_date: string }> {
    const ranges: Array<{ from_date: string; to_date: string }> = [];
    let from = '';
    let to = '';
    for (const date of dates) {
        if (!from) {
            from = date;
            to = date;
            continue;
        }
        if (date === addDays(to, 1)) {
            to = date;
            continue;
        }
        ranges.push({ from_date: from, to_date: to });
        from = date;
        to = date;
    }
    if (from) {
        ranges.push({ from_date: from, to_date: to });
    }
    return ranges;
}

function addDays(iso: string, days: number): string {
    const [year, month, day] = iso.split('-').map((part) => Number(part));
    const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

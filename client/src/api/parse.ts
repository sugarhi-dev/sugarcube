import { z } from 'zod';
import { ApiError } from './http.ts';

export function parseResponse<T extends z.ZodType>(schema: T, body: unknown, message: string): z.output<T> {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new ApiError(502, message);
    }
    return parsed.data;
}

export function parseResponseList<T extends z.ZodType>(
    item: T,
    body: unknown,
    message: string,
): Array<z.output<T>> {
    return parseResponse(z.array(item), body, message);
}

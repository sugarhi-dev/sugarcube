import type { z } from 'zod';

export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
    return schema.parse(body);
}

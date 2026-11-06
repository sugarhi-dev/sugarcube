import type { Request } from 'express';
import type { z } from 'zod';

const adminClientId = 'sugarcube_admin';

type AuthenticatedRequest = Request & { auth?: { sub?: unknown; azp?: unknown } };

export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
    return schema.parse(body);
}

export function authenticatedSubject(req: Request): string | undefined {
    const subject = (req as AuthenticatedRequest).auth?.sub;
    return typeof subject === 'string' && subject.length > 0 ? subject : undefined;
}

export function isAdminClient(req: Request): boolean {
    return (req as AuthenticatedRequest).auth?.azp === adminClientId;
}

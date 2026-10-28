export type ConstraintFailure = {
    statusCode: number;
    message: string;
};

export function constraintFailure(
    error: unknown,
    messages: Record<string, ConstraintFailure>,
): ConstraintFailure | undefined {
    const info = readPgError(error);
    if (!info) {
        return undefined;
    }

    if (info.constraint) {
        const named = messages[info.constraint];
        if (named) {
            return named;
        }
    }

    if (info.code === '23505') {
        return { statusCode: 409, message: 'That record already exists.' };
    }
    if (info.code === '23503') {
        return { statusCode: 400, message: 'A related record was not found.' };
    }
    if (info.code === '23514' || info.code === '22003') {
        return { statusCode: 400, message: 'The submitted values are not allowed.' };
    }
    return undefined;
}

function readPgError(error: unknown): { code: string; constraint?: string } | undefined {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return undefined;
    }

    const code = error.code;
    if (typeof code !== 'string') {
        return undefined;
    }

    const constraint = 'constraint' in error && typeof error.constraint === 'string'
        ? error.constraint
        : undefined;
    return constraint ? { code, constraint } : { code };
}

import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { hasJwt } from '../auth/session.ts';

export function RequireSession({ children }: { children: ReactNode }) {
    if (!hasJwt()) {
        return <Navigate to="/sign-in" replace />;
    }

    return children;
}

import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSession } from '../store/hooks.ts';

export function RequireSession({ children }: { children: ReactNode }) {
    const session = useSession();
    if (!session) {
        return <Navigate to="/sign-in" replace />;
    }

    return children;
}

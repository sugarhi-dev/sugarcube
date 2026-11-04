import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearSession, isLiveSession, loadSession, saveSession, type Session } from '../auth/session.ts';

type SessionContextValue = {
    session: Session | null;
    remember: (session: Session) => void;
    forget: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
    const [stored, setStored] = useState<Session | null>(() => loadSession());
    const session = stored && isLiveSession(stored) ? stored : null;

    useEffect(() => {
        if (stored && !session) {
            clearSession();
            setStored(null);
        }
    }, [session, stored]);

    const value = useMemo<SessionContextValue>(() => ({
        session,
        remember(next) {
            saveSession(next);
            setStored(next);
        },
        forget() {
            clearSession();
            setStored(null);
        },
    }), [session]);

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function useSessionContext(): SessionContextValue {
    const value = useContext(SessionContext);
    if (!value) {
        throw new Error('SessionProvider is missing.');
    }
    return value;
}

export function useSession(): Session | null {
    return useSessionContext().session;
}

export function useSessionActions(): Pick<SessionContextValue, 'remember' | 'forget'> {
    const { remember, forget } = useSessionContext();
    return { remember, forget };
}

import { useEffect } from 'react';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { Session } from '../auth/session.ts';
import { selectSession, sessionCleared } from './sessionSlice.ts';
import type { AppDispatch, RootState } from './store.ts';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function useSession(): Session | null {
    const stored = useAppSelector((state) => state.session.current);
    const session = useAppSelector(selectSession);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (stored && !session) {
            dispatch(sessionCleared());
        }
    }, [dispatch, session, stored]);

    return session;
}

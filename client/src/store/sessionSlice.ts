import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { isLiveSession, loadSession, type Session } from '../auth/session.ts';

type SessionState = {
    current: Session | null;
};

const initialState: SessionState = {
    current: loadSession(),
};

const sessionSlice = createSlice({
    name: 'session',
    initialState,
    reducers: {
        sessionSaved(state, action: PayloadAction<Session>) {
            state.current = action.payload;
        },
        sessionCleared(state) {
            state.current = null;
        },
    },
});

export const { sessionSaved, sessionCleared } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;

export function selectSession(state: { session: SessionState }): Session | null {
    const session = state.session.current;
    if (!session || !isLiveSession(session)) {
        return null;
    }
    return session;
}

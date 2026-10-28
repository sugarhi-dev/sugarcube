import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { clearSession, saveSession } from '../auth/session.ts';
import { sessionCleared, sessionReducer, sessionSaved } from './sessionSlice.ts';

const persistSession = createListenerMiddleware();

persistSession.startListening({
    actionCreator: sessionSaved,
    effect: (action) => {
        saveSession(action.payload);
    },
});

persistSession.startListening({
    actionCreator: sessionCleared,
    effect: () => {
        clearSession();
    },
});

export const store = configureStore({
    reducer: {
        session: sessionReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(persistSession.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

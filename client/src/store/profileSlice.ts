import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CurrentUser } from '../api/me.ts';

type ProfileState = {
    user: CurrentUser | null;
    forSubject: string | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
};

const initialState: ProfileState = {
    user: null,
    forSubject: null,
    status: 'idle',
    error: null,
};

const profileSlice = createSlice({
    name: 'profile',
    initialState,
    reducers: {
        profileRequested(state, action: PayloadAction<string>) {
            if (state.forSubject !== action.payload) {
                state.user = null;
            }
            state.forSubject = action.payload;
            state.status = 'loading';
            state.error = null;
        },
        profileLoaded(state, action: PayloadAction<{ user: CurrentUser; forSubject: string }>) {
            state.user = action.payload.user;
            state.forSubject = action.payload.forSubject;
            state.status = 'ready';
            state.error = null;
        },
        profileFailed(state, action: PayloadAction<{ forSubject: string; error: string }>) {
            if (state.forSubject !== action.payload.forSubject) {
                return;
            }
            state.user = null;
            state.status = 'error';
            state.error = action.payload.error;
        },
        profileCleared() {
            return initialState;
        },
    },
});

export const { profileRequested, profileLoaded, profileFailed, profileCleared } = profileSlice.actions;
export const profileReducer = profileSlice.reducer;

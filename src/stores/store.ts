import { configureStore } from '@reduxjs/toolkit';
import draftCountReducer from '../stores/featues/draftCounterSlice.ts';
import { useDispatch } from 'react-redux';

export const store = configureStore({
    reducer: {
        draftCounter: draftCountReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => typeof store.dispatch = useDispatch;

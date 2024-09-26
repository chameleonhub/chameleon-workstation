import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ToastMessageType } from '../../../electron/bahis.model.ts';

interface NotificationInitialState {
    toastMessage: ToastMessageType;
    toastOpen: boolean;
    status: string;
}

const initialState: NotificationInitialState = {
    toastMessage: {
        type: 'success',
        text: '',
        duration: 5000,
    },
    toastOpen: false,
    status: 'Ready',
};

export const notificationSlice = createSlice({
    name: 'notificator',
    initialState,
    reducers: {
        setToastMessage(state, action: PayloadAction<ToastMessageType>) {
            state.toastMessage = action.payload;
        },
        setStatus(state, action) {
            state.status = action.payload;
        },
        setToastOpen(state, action) {
            state.toastOpen = action.payload;
        },
        OpenToast(state, action: PayloadAction<ToastMessageType | string>) {
            if (typeof action.payload === 'string') {
                state.toastMessage.text = action.payload;
            } else {
                state.toastMessage.text = action.payload.text;
            }
            state.toastOpen = true;
        },
    },
    selectors: {
        selectToastMessage: (state) => state.toastMessage,
        selectToastOpen: (state) => state.toastOpen,
        selectStatus: (state) => state.status,
    },
});

export const { selectToastMessage, selectToastOpen, selectStatus } = notificationSlice.selectors;
export const { setToastMessage, setStatus, setToastOpen, OpenToast } = notificationSlice.actions;
export default notificationSlice.reducer;

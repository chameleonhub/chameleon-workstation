import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ipc } from '../../helpers/ipc';

export interface DraftCounterState {
    value: number;
}

const initialState: DraftCounterState = {
    value: 10,
};

export const fetchDraftCount = createAsyncThunk('draft/fetch', async () => {
    return ipc.invoke('get-local-db', 'select count(*) as count from formlocaldraft').then((response) => {
        return response[0].count;
    });
});

export const draftCounterSlice = createSlice({
    name: 'draftCounter',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(fetchDraftCount.fulfilled, (state, action) => {
            state.value = action.payload;
        });
    },
});

export const selectDraftCount = (state) => state.draftCounter.value;
export default draftCounterSlice.reducer;

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import { theme } from './theme.ts';
import { register } from './services/serviceWorker.ts';
import { ThemeProvider } from '@mui/material';

import { store } from './stores/store';
import { Provider } from 'react-redux';

import './App.css';
import { SnackbarProvider } from 'notistack';

const rootElement = document.getElementById('root') as HTMLElement;
createRoot(rootElement).render(
    <React.StrictMode>
        <Provider store={store}>
            <ThemeProvider theme={theme}>
                <SnackbarProvider maxSnack={4}>
                    <App />
                </SnackbarProvider>
            </ThemeProvider>
        </Provider>
    </React.StrictMode>,
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
register();

postMessage({ payload: 'removeLoading' }, '*');

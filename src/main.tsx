import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import { theme } from './theme.ts';
import { register } from './services/serviceWorker.ts';
import { ThemeProvider } from '@mui/material';

import './App.css';

const rootElement = document.getElementById('root') as HTMLElement;
createRoot(rootElement).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <App />
        </ThemeProvider>
    </React.StrictMode>,
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
register();

postMessage({ payload: 'removeLoading' }, '*');

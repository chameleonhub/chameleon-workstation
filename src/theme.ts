import { createTheme } from '@mui/material/styles';

// default (development) colours
let primary_main = '#036DBA'; // AppBar, Borders, Icons
let primary_light = '#cbf3ff'; // Box backgrounds
let primary_dark = '#034777'; // Box backgrounds
let secondary_main = '#F44336'; // Button backgrounds
let secondary_light = '#FFFAFB'; // Button text
let secondary_dark = '#972d02';
let accent_main = '#2194f3';
let accent_light = '#bbdefb';
let accent_dark = '#1045a1';
// override based on mode
if (import.meta.env.MODE === 'production') {
    primary_main = '#01b54c';
    primary_light = '#dafade';
    primary_dark = '#008037';

    secondary_main = '#af4cac';
    secondary_light = '#e3bfe1';
    secondary_dark = '#571779';

    accent_main = '#38c36a';
    accent_light = '#c1e8c9';
    accent_dark = '#00822b';
}

export const theme = createTheme({
    palette: {
        primary: {
            main: primary_main,
            light: primary_light,
            dark: primary_dark,
            contrastText: 'white',
        },
        secondary: {
            main: secondary_main,
            light: secondary_light,
            dark: secondary_dark,
        },
        error: {
            main: '#f44336',
        },
        warning: {
            main: '#ff9800',
        },
        info: {
            main: '#2196f3',
        },
        success: {
            main: '#4caf50',
            contrastText: 'white',
        },
        accent: {
            main: accent_main,
            light: accent_light,
            dark: accent_dark,
            contrastText: 'white',
        },
    },
});

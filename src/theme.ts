import { createTheme } from '@mui/material/styles';

// default (development) colours
let primary_main = '#036DBA'; // AppBar, Borders, Icons
let primary_light = '#cbf3ff'; // Box backgrounds
let primary_dark = '#034777'; // Box backgrounds
const secondary_main = '#F44336'; // Button backgrounds
const secondary_light = '#FFFAFB'; // Button text
const secondary_dark = '#972d02';
// override based on mode
if (import.meta.env.MODE === 'production') {
    primary_main = '#01b54c';
    primary_light = '#dafade';
    primary_dark = '#008037';
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
    },
});

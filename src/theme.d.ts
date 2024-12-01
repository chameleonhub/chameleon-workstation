// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PaletteOptions, Palette } from '@mui/material/styles';

export {};

declare module '@mui/material/styles' {
    interface Palette {
        accent: Palette['primary'];
    }

    interface PaletteOptions {
        accent?: PaletteOptions['primary'];
    }
}

declare module '@mui/material/IconButton' {
    interface IconButtonPropsColorOverrides {
        accent: true;
    }
}

declare module '@mui/material/Button' {
    interface ButtonPropsColorOverrides {
        accent: true;
    }
}

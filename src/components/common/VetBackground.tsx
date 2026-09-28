import { Box } from '@mui/material';
import { vetTexture } from '../../helpers/vetTexture';

// Full-page veterinary watermark behind a page's content, tinted with the theme's primary colour (blue in
// development, green in production). It is deliberately very faint and sparse (an enlarged tile at half
// opacity), fixed and non-interactive, so it never scrolls with or blocks the content above it.
export const VetBackground = () => (
    <Box
        aria-hidden
        sx={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            pointerEvents: 'none',
            backgroundImage: (theme) => vetTexture(theme.palette.primary.main),
            backgroundSize: '630px 840px',
            opacity: 0.75,
        }}
    />
);

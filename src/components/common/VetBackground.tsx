import { Box } from '@mui/material';
import { VET_TEXTURE_TILE_SIZE, vetTexture } from '../../helpers/vetTexture';

// Full-page veterinary watermark behind a page's content, tinted with the theme's primary colour (blue in
// development, green in production). It is deliberately very faint (the tile itself is a random, sparse
// scatter - see vetTexture.ts - which already keeps a repeat from looking obvious), fixed and
// non-interactive, so it never scrolls with or blocks the content above it.
export const VetBackground = () => (
    <Box
        aria-hidden
        sx={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            pointerEvents: 'none',
            backgroundImage: (theme) => vetTexture(theme.palette.primary.main),
            backgroundSize: VET_TEXTURE_TILE_SIZE,
            opacity: 1,
        }}
    />
);

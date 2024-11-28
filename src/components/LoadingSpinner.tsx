import { Box, CircularProgress, keyframes, Typography } from '@mui/material';
import React from 'react';

interface LoadingProps {
    loadingText?: string;
    zHeight?: number;
}

export const LoadingSpinner: React.FC<LoadingProps> = ({ loadingText = 'Loading', zHeight = null }) => {
    const dotAnimation = keyframes`
        0% {
            content: '';
        }
        20% {
            content: '.';
        }
        40% {
            content: '..';
        }
        60% {
            content: '...';
        }
        80% {
            content: '....';
        }
        100% {
            content: '.....';
        }
    `;

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                ...(zHeight ? { zIndex: zHeight } : {}),
            }}
        >
            <CircularProgress color="primary" />
            <Typography
                variant="h5"
                sx={{
                    mt: 2,
                    color: 'text.primary',
                    display: 'flex',
                    '&::after': {
                        content: "'.....'",
                        width: '2em',
                        textAlign: 'left',
                        display: 'inline-block',
                        animation: `${dotAnimation} 3.5s steps(5, end) infinite`,
                    },
                }}
            >
                {loadingText}
            </Typography>
        </Box>
    );
};

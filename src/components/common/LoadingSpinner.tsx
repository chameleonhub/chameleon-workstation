import { Box, CircularProgress, keyframes, LinearProgress, Typography } from '@mui/material';
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';
import { SyncProgressState } from '../../../electron/bahis.model.ts';

interface LoadingProps {
    loadingText?: string;
    zHeight?: number;
    /** Subscribes to the main process's sync-progress IPC channel and shows a determinate
     * progress bar for whichever table is currently syncing, instead of the plain indeterminate
     * spinner. Only pass this where the loading state really is a sync (SignIn, Header) -
     * Form.tsx/IFrame.tsx use this same component for unrelated loading and shouldn't show it. */
    showSyncProgress?: boolean;
}

export const LoadingSpinner: React.FC<LoadingProps> = ({
    loadingText = 'Loading',
    zHeight = null,
    showSyncProgress = false,
}) => {
    const [progress, setProgress] = useState<SyncProgressState | null>(null);

    useEffect(() => {
        if (!showSyncProgress) return;

        const handleProgress = (_event, state: SyncProgressState) => {
            setProgress(state.active ? state : null);
        };
        ipcRenderer.on('sendSyncProgress', handleProgress);
        return () => {
            ipcRenderer.removeListener('sendSyncProgress', handleProgress);
        };
    }, [showSyncProgress]);

    const current = progress?.current ? progress.categories[progress.current] : undefined;
    const hasDeterminateProgress = Boolean(current && current.total > 0);

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
            {hasDeterminateProgress ? (
                <Box sx={{ width: '24rem', maxWidth: '80vw' }}>
                    <LinearProgress variant="determinate" value={Math.min(100, (current!.completed / current!.total) * 100)} />
                </Box>
            ) : (
                <CircularProgress color="primary" />
            )}
            <Typography
                variant="caption"
                sx={{
                    mt: 2,
                    color: 'text.primary',
                    display: 'flex',
                }}
            >
                {hasDeterminateProgress
                    ? `${progress!.current}${current!.currentItem ? `: ${current!.currentItem}` : ''} (${current!.completed}/${current!.total})`
                    : 'Please wait'}
            </Typography>
            <Typography
                variant="h5"
                sx={{
                    mt: 2,
                    pl: '2rem',
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

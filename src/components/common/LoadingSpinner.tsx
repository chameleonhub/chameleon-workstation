import { ArrowDownward, ArrowUpward } from '@mui/icons-material';
import { Box, CircularProgress, keyframes, LinearProgress, Paper, Typography } from '@mui/material';
import { ipc } from '../../helpers/ipc';
import React, { useEffect, useState } from 'react';
import { SyncFormRecordProgress, SyncProgressState } from '../../../electron/bahis.model.ts';

interface LoadingProps {
    loadingText?: string;
    zHeight?: number;
    /** Subscribes to the main process's sync-progress IPC channel and shows a determinate
     * progress bar for whichever table is currently syncing, instead of the plain indeterminate
     * spinner. Only pass this where the loading state really is a sync (SignIn, Header) -
     * Form.tsx/IFrame.tsx use this same component for unrelated loading and shouldn't show it. */
    showSyncProgress?: boolean;
}

// One line of the "Records by form" list: which form, which way (down from / up to the server), and how many
// of its records are done.
const FormRecordsRow: React.FC<{ record: SyncFormRecordProgress }> = ({ record }) => {
    const { name, direction, completed, total, failed, done } = record;
    let status: string;
    if (total > 0) {
        status = `${completed.toLocaleString()} / ${total.toLocaleString()}`;
    } else if (completed > 0) {
        status = `${completed.toLocaleString()} records`;
    } else if (done) {
        status = failed > 0 ? 'failed' : 'No new records';
    } else {
        status = 'Waiting...';
    }
    if (total > 0 && failed > 0) status += ` (${failed} failed)`;

    const Arrow = direction === 'download' ? ArrowDownward : ArrowUpward;
    return (
        <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Arrow
                    sx={{ fontSize: '1rem', color: 'text.secondary' }}
                    titleAccess={direction === 'download' ? 'Downloading' : 'Uploading'}
                />
                <Typography variant="caption" noWrap sx={{ flex: 1, color: 'text.primary' }}>
                    {name}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        whiteSpace: 'nowrap',
                        color: failed > 0 ? 'error.main' : 'text.secondary',
                        fontWeight: done ? 600 : 400,
                    }}
                >
                    {status}
                </Typography>
            </Box>
            {total > 0 && (
                <LinearProgress
                    variant="determinate"
                    color={failed > 0 ? 'error' : 'primary'}
                    value={Math.min(100, (completed / total) * 100)}
                    sx={{ height: 4, borderRadius: 2 }}
                />
            )}
        </Box>
    );
};

export const LoadingSpinner: React.FC<LoadingProps> = ({
    loadingText = 'Loading',
    zHeight = null,
    showSyncProgress = false,
}) => {
    const [progress, setProgress] = useState<SyncProgressState | null>(null);

    useEffect(() => {
        if (!showSyncProgress) return;

        return ipc.on('sendSyncProgress', (state: SyncProgressState) => {
            setProgress(state.active ? state : null);
        });
    }, [showSyncProgress]);

    const current = progress?.current ? progress.categories[progress.current] : undefined;
    const hasDeterminateProgress = Boolean(current && current.total > 0);
    const formRecordRows = Object.entries(progress?.formRecords ?? {});

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
            {formRecordRows.length > 0 && (
                <Paper
                    variant="outlined"
                    sx={{ mt: 3, p: 1.5, width: '30rem', maxWidth: '85vw', maxHeight: '35vh', overflowY: 'auto' }}
                >
                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary' }}>
                        Records by form
                    </Typography>
                    {formRecordRows.map(([key, record]) => (
                        <FormRecordsRow key={key} record={record} />
                    ))}
                </Paper>
            )}
        </Box>
    );
};

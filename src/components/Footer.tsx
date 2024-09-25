import { Alert, AppBar, IconButton, Snackbar, SnackbarCloseReason, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { NetworkIndicator } from './NetworkIndicator';
import { ipcRenderer } from 'electron';
import CloseIcon from '@mui/icons-material/Close';
import { ToastMessageType } from '../../electron/bahis.model.ts';

export interface FooterProps {
    lastSyncTime?: string;
}

export const Footer: React.FC<FooterProps> = ({ lastSyncTime }) => {
    const [version, setVersion] = useState<string>('');
    const [toastOpen, setToastOpen] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState<ToastMessageType>();
    const [status, setStatus] = React.useState('');
    const [timeOutId, setTimeOutId] = React.useState<NodeJS.Timeout | number | undefined>();

    useEffect(() => {
        ipcRenderer
            .invoke('read-app-version')
            .then((version) => {
                setVersion(version);
            })
            .catch((error) => {
                console.error('Error reading app version:', error);
            });

        ipcRenderer.on('sendMsg', (_evt, msg: ToastMessageType) => {
            setToastMessage(msg);
            setToastOpen(true);
        });

        ipcRenderer.on('sendStatus', (_evt, msg: string) => {
            setStatus(msg);
        });
    }, []);

    useEffect(() => {
        timeOutId && clearTimeout(timeOutId);

        setTimeOutId(
            setTimeout(() => {
                setStatus('');
            }, 10000),
        );
    }, [status]);

    const handleClick = () => {
        setToastOpen(true);
    };

    const handleClose = (_event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
        if (reason === 'clickaway') {
            return;
        }

        setToastOpen(false);
    };

    const action = (
        <React.Fragment>
            <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
                <CloseIcon fontSize="small" />
            </IconButton>
        </React.Fragment>
    );

    return (
        <>
            <AppBar position="fixed" sx={{ top: 'auto', bottom: 0, justifyContent: 'space-evenly', flexDirection: 'row' }}>
                <Typography
                    variant="caption"
                    className="px-2"
                    gutterBottom
                    sx={{
                        display: 'block',
                        height: '1rem',
                        textOverflow: 'ellipsis',
                        maxWidth: '120px',
                        alignSelf: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                    }}
                >
                    {status}
                </Typography>
                <Typography onClick={handleClick} sx={{ marginLeft: 3 }}>
                    Time of last synchronisation: {lastSyncTime}
                </Typography>
                <Typography>{`BAHIS Desk Version ${version}`}</Typography>
                <NetworkIndicator />
            </AppBar>

            <Snackbar
                open={toastOpen}
                autoHideDuration={toastMessage ? toastMessage?.duration : 5000}
                onClose={handleClose}
                action={action}
            >
                <Alert onClose={handleClose} severity={toastMessage ? toastMessage?.type : 'success'} sx={{ width: '100%' }}>
                    {toastMessage?.text}
                </Alert>
            </Snackbar>
        </>
    );
};

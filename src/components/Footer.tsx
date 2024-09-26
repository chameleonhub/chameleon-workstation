import { AppBar, IconButton, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { NetworkIndicator } from './NetworkIndicator';
import { ipcRenderer } from 'electron';
import { ToastMessageType } from '../../electron/bahis.model.ts';
import { useSelector } from 'react-redux';
import {
    selectStatus,
    selectToastMessage,
    setStatus,
    setToastMessage,
    setToastOpen,
} from '../stores/featues/NotificationSlice.ts';
import { useAppDispatch } from '../stores/store.ts';
import { useSnackbar } from 'notistack';
import { Close as CloseIcon } from '@mui/icons-material';

export interface FooterProps {
    lastSyncTime?: string;
}

export const Footer: React.FC<FooterProps> = ({ lastSyncTime }) => {
    const [version, setVersion] = useState<string>('');
    // const toastOpen = useSelector(selectToastOpen);
    const toastMessage = useSelector(selectToastMessage);
    const status = useSelector(selectStatus);

    const [timeOutId, setTimeOutId] = React.useState<NodeJS.Timeout | number | undefined>();
    const dispatch = useAppDispatch();
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

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
            dispatch(setToastMessage(msg));
            dispatch(setToastOpen(true));
        });

        ipcRenderer.on('sendStatus', (_evt, msg: string) => {
            dispatch(setStatus(msg));
        });
    }, []);

    useEffect(() => {
        timeOutId && clearTimeout(timeOutId);

        setTimeOutId(
            setTimeout(() => {
                dispatch(setStatus('Ready'));
            }, 10000),
        );
    }, [status]);

    useEffect(() => {
        if (toastMessage.text) {
            enqueueSnackbar(toastMessage.text, {
                autoHideDuration: toastMessage.duration || 5000,
                variant: toastMessage.type || 'success',
                action: action,
                preventDuplicate: true,
            });
        }
    }, [toastMessage]);

    const handleClose = (snackbarId) => {
        closeSnackbar(snackbarId);
        dispatch(setToastOpen(false));
    };

    const action = (snackbarId) => (
        <>
            <IconButton
                onClick={() => {
                    handleClose(snackbarId);
                }}
            >
                <CloseIcon />
            </IconButton>
        </>
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
                <Typography sx={{ marginLeft: 3 }}>Last sync: {lastSyncTime}</Typography>
                <Typography>{`App version ${version}`}</Typography>
                <NetworkIndicator />
            </AppBar>
        </>
    );
};

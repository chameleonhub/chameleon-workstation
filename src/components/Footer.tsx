import { AppBar, Box, IconButton, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
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
import { Close as CloseIcon, Info as InfoIcon } from '@mui/icons-material';
import chameleonLogo from '../assets/chameleon_white.png';

export interface FooterProps {
    lastSyncTime?: string;
}

export const Footer: React.FC<FooterProps> = ({ lastSyncTime }) => {
    const [version, setVersion] = useState<string>('');
    const [tooltipOpen, setTooltipOpen] = useState(false);
    // const toastOpen = useSelector(selectToastOpen);
    const toastMessage = useSelector(selectToastMessage);
    const status = useSelector(selectStatus);

    const [timeOutId, setTimeOutId] = React.useState<NodeJS.Timeout | number | undefined>();
    const dispatch = useAppDispatch();
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        ipcRenderer
            .invoke('read-app-version')
            .then((version) => {
                setVersion(version);
            })
            .catch((error) => {
                console.error('Error reading app version:', error);
            });

        const updateMessage = (_evt, msg: ToastMessageType) => {
            dispatch(setToastMessage(msg));
            dispatch(setToastOpen(true));
        };
        ipcRenderer.on('sendMsg', updateMessage);

        const updateStatus = (_event, msg: string) => {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
            debounceTimeout.current = setTimeout(() => {
                if (msg !== status) {
                    dispatch(setStatus(msg));
                }
            }, 1);
        };

        ipcRenderer.on('sendStatus', updateStatus);

        setTooltipOpen(true);
        const tooltipTimer = setTimeout(() => {
            setTooltipOpen(false);
        }, 10000);

        return () => {
            ipcRenderer.removeListener('sendStatus', updateStatus);
            ipcRenderer.removeListener('sendMsg', updateMessage);

            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
            clearTimeout(tooltipTimer);
        };
    }, []);

    useEffect(() => {
        timeOutId && clearTimeout(timeOutId);

        setTimeOutId(
            setTimeout(() => {
                dispatch(setStatus('Ready'));
            }, 15000),
        );
        return () => {
            timeOutId && clearTimeout(timeOutId);
        };
    }, [status]);

    useEffect(() => {
        if (toastMessage.text) {
            enqueueSnackbar(toastMessage.text, {
                autoHideDuration: toastMessage.duration || 5000,
                variant: toastMessage.type || 'success',
                action: action,
                preventDuplicate: true,
                ...toastMessage.options,
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
            <AppBar
                className="footer-container"
                position="fixed"
                sx={{ top: 'auto', bottom: 0, justifyContent: 'space-evenly', flexDirection: 'row', zIndex: 0 }}
            >
                <Typography variant="caption" className="px-2" gutterBottom>
                    {status}
                </Typography>
                <Typography sx={{ marginLeft: 3, display: 'flex', alignItems: 'center' }}>
                    Last sync: {lastSyncTime}
                </Typography>
                <Typography sx={{ display: 'flex', alignItems: 'center' }}>{`App version ${version}`}</Typography>
                <NetworkIndicator />
                <Tooltip title="Powered by Chameleon">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="caption">Powered by</Typography>
                        <img src={chameleonLogo} alt="Powered by Logo" style={{ height: '1.5rem', width: 'auto' }} />
                    </Box>
                </Tooltip>
                <Tooltip
                    title={
                        <h1 style={{ fontSize: '1rem' }}>
                            In this version, previous data is temporarily unavailable. The data is going to be available soon.
                        </h1>
                    }
                    open={tooltipOpen}
                    onClose={() => setTooltipOpen(false)}
                    onOpen={() => setTooltipOpen(true)}
                >
                    <IconButton color="accent" sx={{ color: 'white' }}>
                        <InfoIcon />
                    </IconButton>
                </Tooltip>
            </AppBar>
        </>
    );
};

import { useEffect, useState } from 'react';
import { ipcRenderer } from 'electron';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';
import { log } from '../helpers/log';

export interface AlertContent {
    severity: 'error' | 'warning' | 'info' | 'success';
    message: string;
}

export const SystemAlerts = () => {
    const [alertContent, setAlertContent] = useState<AlertContent | null>(null);

    const navigate = useNavigate();

    const alertClose = () => {
        setAlertContent(null);
    };

    // respond to the user selecting Reset Database from the menu
    useEffect(() => {
        ipcRenderer.on('init-refresh-database', async () => {
            ipcRenderer
                .invoke('get-local-db', 'select count(*) from formlocaldraft')
                .then((response) => {
                    const unSyncData = response?.count || 0;

                    if (unSyncData > 0) {
                        setAlertContent({
                            severity: 'error',
                            message: `${unSyncData} data unsynced! Please Sync first`,
                        });
                    } else {
                        setAlertContent({
                            severity: 'success',
                            message: `Database will refresh shortly. You will be automatically logged out.
                            Please login again and sync first. 
                            It might take a while for the first sync. please be patient while syncing`,
                        });

                        ipcRenderer.invoke('refresh-database').then(() => {
                            navigate('/');
                            setAlertContent(null);
                        });
                    }
                })
                .catch((error) => {
                    log.error(`Error reading form definition: ${error}`);
                });
        });
    }, [navigate]);

    return (
        <>
            {alertContent && (
                <Alert severity={alertContent.severity} onClose={alertClose}>
                    {alertContent.message}
                </Alert>
            )}
        </>
    );
};

import { useEffect, useState } from 'react';
import SignalCellular4BarIcon from '@mui/icons-material/SignalCellular4Bar';
import SignalCellularOffIcon from '@mui/icons-material/SignalCellularOff';
import { Alert, Box, Snackbar, Tooltip, Typography } from '@mui/material';
import { log } from '../helpers/log';

export const NetworkIndicator = () => {
    const [online, setOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);

    useEffect(() => {
        // create event handler
        const handleStatusChange = () => {
            log.info('Network status changed');
            setOnline(navigator.onLine);
        };

        // listen for online and ofline event
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);

        // clean up to avoid memory-leak
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    return (
        <>
            <Snackbar open={!online} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} key={'topcenter'}>
                <Alert severity="error">You are offline - you will not be able to sync your data.</Alert>
            </Snackbar>
            {online ? (
                <Tooltip title="Good network connection">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SignalCellular4BarIcon />
                        <Typography sx={{ paddingLeft: '.30rem' }}>Good connection</Typography>
                    </Box>
                </Tooltip>
            ) : (
                <Tooltip title="Poor network connection - you may have troubles syncing your data!">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SignalCellularOffIcon color="error" />
                        <Typography fontWeight="bold" color="error">
                            Poor connection
                        </Typography>
                    </Box>
                </Tooltip>
            )}
        </>
    );
};

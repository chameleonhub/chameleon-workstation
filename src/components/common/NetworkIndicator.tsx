import { useCallback, useEffect, useRef, useState } from 'react';
import SignalCellular4BarIcon from '@mui/icons-material/SignalCellular4Bar';
import SignalCellularOffIcon from '@mui/icons-material/SignalCellularOff';
import { Alert, Box, CircularProgress, Snackbar, Tooltip, Typography } from '@mui/material';

const BAHIS_SERVER_URL = import.meta.env.VITE_BAHIS_SERVER_URL as string | undefined;
const CHECK_INTERVAL_MS = 60000;
const CHECK_TIMEOUT_MS = 5000;

const SLOW_RESPONSE_MS = 3000;

type ConnectionStatus = 'good' | 'poor' | 'none';

const checkServerReachable = async (): Promise<ConnectionStatus> => {
    if (!navigator.onLine) return 'none';
    if (!BAHIS_SERVER_URL) return 'good';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    const start = performance.now();
    try {
        await fetch(`${BAHIS_SERVER_URL}/healthz/`, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
        return performance.now() - start > SLOW_RESPONSE_MS ? 'poor' : 'good';
    } catch {
        return 'none';
    } finally {
        clearTimeout(timeout);
    }
};

export const NetworkIndicator = () => {
    // Optimistic initial value - the real check below runs immediately on mount and corrects it
    // within CHECK_TIMEOUT_MS, so this only matters for the very first render.
    const [status, setStatus] = useState<ConnectionStatus>('good');
    const [checking, setChecking] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const mountedRef = useRef(true);

    const runCheck = useCallback(() => {
        setChecking(true);
        checkServerReachable().then((result) => {
            if (!mountedRef.current) return;
            // log.info(`Network status check: ${result}`);
            setStatus(result);
            setChecking(false);
            setLastChecked(new Date());
        });
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        runCheck();
        const interval = setInterval(runCheck, CHECK_INTERVAL_MS);

        // Also re-check immediately on the OS-level online/offline events, rather than waiting for
        // the next interval tick - these fire faster than a 1-minute poll when connectivity
        // actually changes (e.g. plugging in an ethernet cable, or losing WiFi).
        window.addEventListener('online', runCheck);
        window.addEventListener('offline', runCheck);

        return () => {
            mountedRef.current = false;
            clearInterval(interval);
            window.removeEventListener('online', runCheck);
            window.removeEventListener('offline', runCheck);
        };
    }, [runCheck]);

    const statusText = {
        good: 'Connected to the BAHIS server',
        poor: 'Connected to the BAHIS server, but the response was slow - you may have trouble syncing data.',
        none: 'Cannot reach the BAHIS server - you may have trouble syncing your data!',
    }[status];
    const lastCheckedText = lastChecked ? ` Last checked ${lastChecked.toLocaleTimeString()}.` : '';
    const label = { good: 'Good connection', poor: 'Poor connection', none: 'No connection' }[status];
    const color = { good: undefined, poor: 'warning.main', none: 'error.main' }[status];

    return (
        <>
            <Snackbar open={status === 'none'} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} key={'topcenter'}>
                <Alert severity="error">You are offline - you will not be able to sync your data.</Alert>
            </Snackbar>
            <Tooltip title={`${statusText}${lastCheckedText} Click to check now.`}>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={runCheck}>
                    {status === 'none' ? <SignalCellularOffIcon color="error" /> : <SignalCellular4BarIcon sx={{ color }} />}
                    <Typography sx={{ paddingLeft: '.30rem', fontWeight: status === 'good' ? 400 : 'bold', color }}>
                        {label}
                    </Typography>
                    {checking && <CircularProgress size={14} thickness={5} sx={{ marginLeft: '6px', color }} />}
                </Box>
            </Tooltip>
        </>
    );
};

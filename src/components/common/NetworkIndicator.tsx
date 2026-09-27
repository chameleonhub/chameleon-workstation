import { useCallback, useEffect, useRef, useState } from 'react';
import SignalCellular4BarIcon from '@mui/icons-material/SignalCellular4Bar';
import SignalCellularOffIcon from '@mui/icons-material/SignalCellularOff';
import { Alert, Chip, CircularProgress, Snackbar, Tooltip } from '@mui/material';
import { log } from '../../helpers/log';

const BAHIS_SERVER_URL = import.meta.env.VITE_BAHIS_SERVER_URL as string | undefined;
const CHECK_INTERVAL_MS = 60000;
const CHECK_TIMEOUT_MS = 5000;

// navigator.onLine only reflects whether the OS reports some network interface as up - it stays
// true on a WiFi network with no real internet, or when the BAHIS server itself is down, both of
// which matter a lot more to a field agent than "is any network adapter active". A no-cors fetch
// against the server actually exercises the connection this app cares about; 'no-cors' mode avoids
// needing the server to cooperate with CORS just to answer "are you reachable" - an opaque
// response (or none at all, on failure/timeout) is all that's needed here.
//
// Hits Nexus's /healthz/ - a trivial, unauthenticated, DB-free view added specifically for this
// (see chameleon-nexus's nexus/portal/views.py), rather than the root page (login_required, and
// even once authenticated a full template render) or any other real API route.
const checkServerReachable = async (): Promise<boolean> => {
    if (!navigator.onLine) return false;
    if (!BAHIS_SERVER_URL) return true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    try {
        await fetch(`${BAHIS_SERVER_URL}/healthz/`, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
        return true;
    } catch {
        return false;
    } finally {
        clearTimeout(timeout);
    }
};

export const NetworkIndicator = () => {
    // Optimistic initial value - the real check below runs immediately on mount and corrects it
    // within CHECK_TIMEOUT_MS, so this only matters for the very first render.
    const [online, setOnline] = useState(true);
    const [checking, setChecking] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const mountedRef = useRef(true);

    const runCheck = useCallback(() => {
        setChecking(true);
        checkServerReachable().then((reachable) => {
            if (!mountedRef.current) return;
            log.info(`Network status check: ${reachable ? 'reachable' : 'unreachable'}`);
            setOnline(reachable);
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

    const statusText = online
        ? 'Connected to the BAHIS server'
        : 'Cannot reach the BAHIS server - you may have trouble syncing your data!';
    const lastCheckedText = lastChecked ? ` Last checked ${lastChecked.toLocaleTimeString()}.` : '';

    return (
        <>
            <Snackbar open={!online} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} key={'topcenter'}>
                <Alert severity="error">You are offline - you will not be able to sync your data.</Alert>
            </Snackbar>
            <Tooltip title={`${statusText}${lastCheckedText} Click to check now.`}>
                <Chip
                    size="small"
                    onClick={runCheck}
                    color={online ? 'success' : 'error'}
                    variant={online ? 'outlined' : 'filled'}
                    label={online ? 'Good connection' : 'No connection'}
                    icon={
                        checking ? (
                            <CircularProgress
                                size={14}
                                thickness={5}
                                sx={{ marginLeft: '6px', color: online ? 'success.main' : 'error.main' }}
                            />
                        ) : online ? (
                            <SignalCellular4BarIcon fontSize="small" />
                        ) : (
                            <SignalCellularOffIcon fontSize="small" />
                        )
                    }
                    sx={{ fontWeight: online ? 400 : 600, cursor: 'pointer' }}
                />
            </Tooltip>
        </>
    );
};

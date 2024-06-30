import PreviewIcon from '@mui/icons-material/Preview';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import SyncIcon from '@mui/icons-material/Sync';
import { Alert, AppBar, Badge, Box, Button, CircularProgress, Snackbar, Toolbar } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { log } from '../helpers/log';
import { ipcRenderer } from 'electron';

const getDraftCount = async () => {
    log.info('GET local draft Count');
    return ipcRenderer.invoke('get-local-db', 'select count(*) as count from formlocaldraft').then((response) => {
        return response[0].count;
    });
};

export const Header = () => {
    const [draftCount, setDraftCount] = useState<number>(0);
    const [isWaitingForDataSync, setWaitingForDataSync] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(
            () =>
                getDraftCount().then((unsyncCount) => {
                    setDraftCount(unsyncCount);
                    log.info(`Draft count: ${unsyncCount}`);
                }),
            1000,
        );
        return () => clearTimeout(timer);
    }, [isWaitingForDataSync]);

    const handleClose = () => {
        setWaitingForDataSync(false);
    };

    const handleDraftSync = async () => {
        setWaitingForDataSync(true);

        await ipcRenderer
            .invoke('request-user-data-sync')
            .then(() => {
                log.info('Drafts successfully synced');
                setWaitingForDataSync(false);
            })
            .catch((error) => {
                log.error(`Error syncing drafts: ${error}`);
                setWaitingForDataSync(false);
            })
            .finally(() => {
                setTimeout(() => {
                    setWaitingForDataSync(false);
                }, 1000);
            });
    };

    const onBackHandler = () => {
        navigate(-1);
    };

    const onHomeHandler = () => {
        navigate('/menu/0');
    };

    const getButtonColor = () => {
        return draftCount === 0 ? 'primary' : 'secondary';
    };

    const Toast = () => (
        <Snackbar open={isWaitingForDataSync} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} key={'topcenter'}>
            <Alert severity="info" onClose={handleClose} icon={false}>
                <CircularProgress size={'1rem'} /> Synchronising data.
            </Alert>
        </Snackbar>
    );

    return (
        <AppBar position="sticky">
            {isWaitingForDataSync && <Toast />}
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                <Button color="inherit" onClick={onHomeHandler} startIcon={<HomeIcon />}>
                    Home
                </Button>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Badge badgeContent={draftCount} color="warning">
                        <Button variant="contained" onClick={() => navigate('list/drafts')} disabled={isWaitingForDataSync}>
                            <PreviewIcon />
                            Review Drafts
                        </Button>
                    </Badge>
                    <Button
                        variant="contained"
                        color={getButtonColor()}
                        onClick={handleDraftSync}
                        disabled={isWaitingForDataSync}
                    >
                        <SyncIcon />
                        Submit Drafts
                    </Button>
                </Box>
                <Button color="inherit" onClick={onBackHandler} startIcon={<ArrowBackIcon />}>
                    Back
                </Button>
            </Toolbar>
        </AppBar>
    );
};

import {
    Alert,
    Avatar,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { log } from '../helpers/log';
import { ipcRenderer } from 'electron';
import { AlertContent } from './SystemAlerts';

interface userData {
    username: string;
    password: string;
}

export const SignIn = () => {
    const [alertContent, setAlertContent] = React.useState<AlertContent | null>(null);
    const [openChangeUserDialog, setOpenChangeUserDialog] = React.useState<boolean>(false);
    const [isSignedIn, setIsSignedIn] = React.useState<boolean>(false);
    const [userData, setUserData] = React.useState<userData>();
    const [userName, setUserName] = React.useState<string>('');

    const navigate = useNavigate();

    useEffect(() => {
        if (isSignedIn) {
            log.info('User is signed in. Starting app sync.');
            ipcRenderer
                .invoke('request-app-data-sync')
                .catch(() => {
                    setAlertContent({
                        severity: 'warning',
                        message:
                            'Unable to automatically sync app data. Please ensure a good internet connection and use the Sync Now button on the next screen.',
                    });
                })
                .finally(() => {
                    log.info('App sync attempt complete. Navigating to menu.');
                    navigate('/menu/0');
                });
        }
    }, [navigate, isSignedIn]);

    useEffect(() => {
        ipcRenderer.invoke('get-user-data').then((res) => {
            if (res) {
                setUserName(res.username);
            }
        });
    });

    const handleChangeUserConfirmation = async (answer) => {
        if (answer === 'delete') {
            ipcRenderer.invoke('refresh-database').then(() => {
                setOpenChangeUserDialog(false);
                ipcRenderer.invoke('sign-in', userData).then(() => {
                    setIsSignedIn(true);
                });
            });
        } else {
            setAlertContent(null);
            setOpenChangeUserDialog(false);
        }
    };

    const ChangeUserDialog = (props) => {
        return (
            <Dialog open={props.open}>
                <DialogTitle>Change of User Warning</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        You are changing the local user. This will delete the previous user's data and replace it with the new
                        user's data. Are you sure you want to delete the data ?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => props.handleClick('delete')} color="error">
                        Delete entire database!
                    </Button>
                    <Button onClick={() => props.handleClick('no')} autoFocus>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    const onSubmit = async (event) => {
        log.info('Attempting client-side sign in');

        event.preventDefault();
        const data = new FormData(event.currentTarget);

        const username = data.get('username') as string;
        const password = data.get('password') as string;

        if (!username || !password) {
            setAlertContent({ severity: 'error', message: 'Please fill in both fields' });
            return;
        }

        setUserData({ username, password });

        ipcRenderer.invoke('sign-in', { username, password }).then((response) => {
            log.info('Sign in response received');
            switch (response) {
                case 'offline-user-success':
                    setAlertContent({
                        severity: 'info',
                        message:
                            "Found an offline-ready account with those credentials. Logging you in.\nIf you are connected to the internet a data sync may occur automatically, which may take some time; if not, please use the 'Sync Now' button on the next screen.",
                    });
                    log.info('Local account found, logging in.');
                    setIsSignedIn(true);
                    break;
                case 'offline-user-fail':
                    setAlertContent({
                        severity: 'error',
                        message: 'Failed to sign in. Please check your credentials and try again.',
                    });
                    log.info('Credentials error.');
                    break;
                case 'change-user':
                    setAlertContent({
                        severity: 'warning',
                        message: 'You requested a change of user database.',
                    });
                    setOpenChangeUserDialog(true);
                    break;
                case 'fresh-user-success':
                    setAlertContent({
                        severity: 'info',
                        message:
                            'You are logging in for the first time.\n Please wait as the app synchronises app data for offline use.',
                    });
                    setIsSignedIn(true);
                    break;
                case 'fresh-user-fail':
                    setAlertContent({
                        severity: 'error',
                        message: 'Failed to sign in. Please check your credentials and try again.',
                    });
                    break;
                default:
                    setAlertContent({
                        severity: 'error',
                        message: `Possible unknown error while signing you in. Please close the app and try again.\n${response?.message}`,
                    });
                    break;
            }
        });
    };

    const alertClose = () => {
        setAlertContent(null);
    };

    const signInAlert = (content) => {
        return (
            <Alert severity={content.severity} onClose={alertClose}>
                {content.message}
            </Alert>
        );
    };

    return (
        <>
            <Box>
                <Typography color="text.secondary" gutterBottom>
                    Last Logged in as:
                    <Button size="small" onClick={() => navigate('/menu/0')} variant="text">
                        {userName}
                    </Button>
                </Typography>
            </Box>
            <Box
                sx={{
                    height: '80vh',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        backgroundColor: 'primary.light',
                        px: '1.5rem',
                        py: '2rem',
                        borderRadius: '0.5rem',
                    }}
                >
                    <Avatar variant="square" src="/icon.png" sx={{ width: 50, height: 50, margin: 1 }} />
                    <Box component="form" noValidate onSubmit={onSubmit} sx={{ marginTop: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Username"
                            name="username"
                            autoComplete="username"
                            autoFocus
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                        />
                        <Button type="submit" fullWidth variant="contained" sx={{ marginTop: 3, marginBottom: 2 }}>
                            Sign In
                        </Button>
                    </Box>
                    {alertContent && signInAlert(alertContent)}
                </Box>
            </Box>
            <ChangeUserDialog open={openChangeUserDialog} handleClick={(event) => handleChangeUserConfirmation(event)} />
        </>
    );
};

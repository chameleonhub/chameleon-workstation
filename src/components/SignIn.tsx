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
import { grey } from '@mui/material/colors';
import bahisLogo from '../assets/images/bahis_logo.png';
import { LoadingSpinner } from './LoadingSpinner.tsx';

interface UserData {
    username: string;
    password: string;
}

export const SignIn = () => {
    const [alertContent, setAlertContent] = React.useState<AlertContent | null>(null);
    const [openChangeUserDialog, setOpenChangeUserDialog] = React.useState<boolean>(false);
    const [isSignedIn, setIsSignedIn] = React.useState<boolean>(false);
    const [isSignedInValid, setIsSignedInValid] = React.useState<boolean>(false);
    const [userData, setUserData] = React.useState<UserData>();
    const [userName, setUserName] = React.useState<string>('');
    const [isFreshSignedIn, setIsFreshSignedIn] = React.useState<boolean>(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (isSignedIn) {
            log.info('User is signed in. Starting app sync.');
            ipcRenderer
                .invoke('request-app-data-sync')
                .then(() => {
                    navigate('/menu/0');
                })
                .catch(() => {
                    setAlertContent({
                        severity: 'warning',
                        message:
                            'Unable to automatically sync app data. Please ensure a good internet connection and use the Sync Now button on the next screen.',
                    });
                    if (!isFreshSignedIn) {
                        navigate('/menu/0');
                    }
                })
                .finally(() => {
                    log.info('App sync attempt complete. Navigating to menu.');
                });
        }
    }, [navigate, isSignedIn]);

    useEffect(() => {
        ipcRenderer.invoke('get-user-data').then((res) => {
            if (res) {
                setUserName(res.username);

                const diffInDays = (Date.now() - Date.parse(res.last_login)) / (1000 * 3600 * 24);
                if (diffInDays <= 7) {
                    setIsSignedInValid(true);
                }
            }
        });
    });

    const handleChangeUserConfirmation = async (answer) => {
        if (answer === 'delete') {
            setIsSignedInValid(false);
            setUserName('No User');
            ipcRenderer.invoke('refresh-database').then(() => {
                setOpenChangeUserDialog(false);
                if (userData) {
                    checkCredentials(userData.username, userData.password);
                }
            });
        } else {
            setAlertContent(null);
            setOpenChangeUserDialog(false);
        }
    };

    interface ChangeUserDialogProps {
        open: boolean;
        handleClick: (type: string) => void;
    }

    const ChangeUserDialog = (props: ChangeUserDialogProps) => {
        return (
            <Dialog open={props.open}>
                <DialogTitle>Change of User Warning</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        You are changing the local user. This will delete the previous user&apos;s data and replace it with the
                        new user&apos;s data. Are you sure you want to delete the data ?
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

    const checkCredentials = (username: string, password: string) => {
        ipcRenderer.invoke('sign-in', { username, password }).then((response) => {
            log.info('Sign in response received');
            setIsFreshSignedIn(false);
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
                    setIsSignedIn(false);
                    break;
                case 'change-user':
                    setAlertContent({
                        severity: 'warning',
                        message: 'You requested a change of user database.',
                    });
                    setOpenChangeUserDialog(true);
                    setIsSignedIn(false);
                    break;
                case 'fresh-user-success':
                    setAlertContent({
                        severity: 'info',
                        message:
                            'You are logging in for the first time.\n Please wait as the app synchronises app data for offline use.',
                    });
                    setIsSignedIn(true);
                    setIsFreshSignedIn(true);
                    break;
                case 'fresh-user-fail':
                    setAlertContent({
                        severity: 'error',
                        message: 'Failed to sign in. Please check your credentials and try again.',
                    });
                    setIsSignedIn(false);
                    break;
                case 'unauthorized':
                    setAlertContent({
                        severity: 'error',
                        message: 'Authentication Failed!! Please check your credentials and try again.',
                    });
                    setIsSignedIn(false);
                    break;
                case 'disconnected':
                    setAlertContent({
                        severity: 'error',
                        message: 'Sign in Failed!! Please check your internet connection.',
                    });
                    setIsSignedIn(false);
                    break;
                default:
                    setAlertContent({
                        severity: 'error',
                        message: `Possible unknown error while signing you in. Please close the app and try again.\n${response?.message}`,
                    });
                    setIsSignedIn(false);
                    break;
            }
        });
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
        checkCredentials(username, password);
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
                    {isSignedInValid ? (
                        <Button size="small" onClick={() => navigate('/menu/0')} variant="text">
                            {userName}
                        </Button>
                    ) : userName ? (
                        ` ${userName}`
                    ) : (
                        ' No User'
                    )}
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
                        backgroundColor: grey[200],
                        px: '1.5rem',
                        py: '2rem',
                        borderRadius: '0.5rem',
                    }}
                >
                    <Avatar variant="square" src={bahisLogo} sx={{ width: 'auto', height: 50, margin: 1 }} />
                    <Box component="form" noValidate onSubmit={onSubmit} sx={{ marginTop: 1 }}>
                        <TextField
                            sx={{
                                backgroundColor: 'white',
                            }}
                            variant="outlined"
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
                            sx={{
                                backgroundColor: 'white',
                            }}
                            variant="outlined"
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
                    {alertContent && isSignedIn && isFreshSignedIn && <LoadingSpinner loadingText={alertContent.message} />}
                </Box>
            </Box>
            <ChangeUserDialog open={openChangeUserDialog} handleClick={(event) => handleChangeUserConfirmation(event)} />
        </>
    );
};

import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {
    AccountCircle,
    ArrowForward,
    CloudOff,
    Lock,
    Person,
    Security,
    Sync,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { log } from '../../helpers/log';
import { ipc } from '../../helpers/ipc';
import { VET_TEXTURE_TILE_SIZE, vetTexture } from '../../helpers/vetTexture';
import { AlertContent } from '../common/SystemAlerts';
import bahisWhite from '../../assets/images/bahis_white.png';
import { LoadingSpinner } from '../common/LoadingSpinner.tsx';
import { OpenToast } from '../../stores/featues/NotificationSlice.ts';
import { useAppDispatch } from '../../stores/store.ts';

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
    const [showPassword, setShowPassword] = React.useState<boolean>(false);
    const [isSyncing, setIsSyncing] = React.useState<boolean>(false);

    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (isSignedIn) {
            log.info('User is signed in. Starting app sync.');
            setIsSyncing(true);
            // The main process sends its own detailed "Sync complete: N forms, N records, ..."
            // Toast once counts are known (see getAppData in electron/main.ts) - only the
            // invoke-level rejection (the whole IPC call failing) needs a toast dispatched here.
            ipc.invoke('request-app-data-sync')
                .then(() => {
                    navigate('/menu/0');
                })
                .catch(() => {
                    setAlertContent({
                        severity: 'warning',
                        message:
                            'Unable to automatically sync app data. Please ensure a good internet connection and use the Sync Now button on the next screen.',
                    });
                    dispatch(OpenToast({ type: 'warning', text: 'Unable to sync data automatically' }));
                    if (!isFreshSignedIn) {
                        navigate('/menu/0');
                    }
                })
                .finally(() => {
                    log.info('App sync attempt complete. Navigating to menu.');
                    setIsSyncing(false);
                });
        }
    }, [navigate, isSignedIn]);

    useEffect(() => {
        ipc.invoke('get-user-data').then((res) => {
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
            ipc.invoke('refresh-database').then(() => {
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
        ipc.invoke('sign-in', { username, password }).then((response) => {
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
            <Alert severity={content.severity} onClose={alertClose} sx={{ whiteSpace: 'pre-line' }}>
                {content.message}
            </Alert>
        );
    };

    return (
        <>
            {isSyncing && (
                <LoadingSpinner
                    loadingText="Syncing your data"
                    message={alertContent?.message}
                    zHeight={5000}
                    showSyncProgress
                />
            )}

            {/* soft full-screen backdrop, so the page isn't a white void around the card */}
            <Box
                aria-hidden
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: -1,
                    // background: (theme) =>
                    //     `linear-gradient(135deg, ${theme.palette.primary.light} 0%, #ffffff 60%, ${theme.palette.primary.light} 100%)`,
                }}
            />

            <Box sx={{ minHeight: '78vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* two offset layers peek out below the card, like stacked sheets, in the theme's primary colour */}
                <Box
                    sx={{
                        position: 'relative',
                        width: 'min(58rem, 100%)',
                        '&::before, &::after': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 3,
                            zIndex: 0,
                        },
                        '&::before': {
                            transform: 'translateY(30px) scale(0.88)',
                            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
                        },
                        '&::after': {
                            transform: 'translateY(15px) scale(0.94)',
                            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.22),
                        },
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            position: 'relative',
                            zIndex: 1,
                            width: '100%',
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '5fr 6fr' },
                            borderRadius: 3,
                            overflow: 'hidden',
                            // layered shadows: a tight contact shadow, a mid-range one and a wide, soft ambient one
                            boxShadow: (theme) =>
                                `0 2px 4px ${alpha('#000000', 0.08)}, 0 12px 24px ${alpha('#000000', 0.12)}, 0 32px 64px ${alpha(theme.palette.primary.dark, 0.28)}`,
                        }}
                    >
                        {/* brand panel */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: 3,
                                p: { xs: 3, md: 5 },
                                color: '#fff',
                                // vet texture over a soft light glow (as on the BAHIS Dashboard) over the theme-coloured gradient
                                backgroundImage: (theme) =>
                                    [
                                        vetTexture('#fff'),
                                        'radial-gradient(circle at 88% 18%, rgba(255, 255, 255, 0.2), transparent 18rem)',
                                        `linear-gradient(160deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                    ].join(', '),
                                backgroundSize: `${VET_TEXTURE_TILE_SIZE}, auto, auto`,
                                backgroundRepeat: 'repeat, no-repeat, no-repeat',
                            }}
                        >
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                    <Box component="img" src={bahisWhite} alt="" sx={{ height: 48 }} />
                                    <Typography
                                        variant="h3"
                                        component="span"
                                        sx={{ color: 'inherit', fontWeight: 700, letterSpacing: 1 }}
                                    >
                                        BAHIS
                                    </Typography>
                                </Box>
                                <Typography variant="h5" sx={{ color: 'inherit', fontWeight: 700, lineHeight: 1.25 }}>
                                    Bangladesh Animal Health Intelligence System
                                </Typography>
                                <Typography sx={{ color: 'inherit', opacity: 0.85, mt: 1.5 }}>
                                    Collect animal health data in the field, on or off the network.
                                </Typography>
                            </Box>
                            <Stack spacing={2} sx={{ display: { xs: 'none', md: 'flex' } }}>
                                {[
                                    { icon: <CloudOff />, text: 'Works offline - fill in forms anywhere' },
                                    { icon: <Sync />, text: 'Syncs your reports when you are back online' },
                                    { icon: <Security />, text: 'Your data stays safe on this device until synced' },
                                ].map(({ icon, text }) => (
                                    <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                p: 1,
                                                borderRadius: '50%',
                                                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                                            }}
                                        >
                                            {icon}
                                        </Box>
                                        <Typography variant="body2" sx={{ color: 'inherit' }}>
                                            {text}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>

                        {/* sign-in panel */}
                        <Box
                            sx={{
                                p: { xs: 3, md: 5 },
                                backgroundColor: '#fff',
                                // fine line grid in the theme's primary colour (blue in development, green in production)
                                backgroundImage: (theme) => {
                                    const line = alpha(theme.palette.primary.main, 0.09);
                                    return `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`;
                                },
                                backgroundSize: '40px 40px',
                            }}
                        >
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                Welcome back
                            </Typography>
                            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                Sign in to continue
                            </Typography>

                            <Box sx={{ mt: 2, minHeight: '2.5rem', display: 'flex', alignItems: 'center' }}>
                                {isSignedInValid ? (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<AccountCircle />}
                                        endIcon={<ArrowForward />}
                                        onClick={() => navigate('/menu/0')}
                                    >
                                        Continue as {userName}
                                    </Button>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        {userName
                                            ? `Last signed in as ${userName}`
                                            : 'No user has signed in on this device yet'}
                                    </Typography>
                                )}
                            </Box>

                            <Box component="form" noValidate onSubmit={onSubmit} sx={{ mt: 1 }}>
                                <TextField
                                    variant="outlined"
                                    margin="normal"
                                    sx={{ backgroundColor: '#fff' }}
                                    required
                                    fullWidth
                                    id="username"
                                    label="Username"
                                    name="username"
                                    autoComplete="username"
                                    autoFocus
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Person color="action" />
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                />
                                <TextField
                                    variant="outlined"
                                    margin="normal"
                                    sx={{ backgroundColor: '#fff' }}
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    autoComplete="current-password"
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Lock color="action" />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                        onClick={() => setShowPassword((show) => !show)}
                                                        onMouseDown={(event) => event.preventDefault()}
                                                        edge="end"
                                                    >
                                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    size="large"
                                    variant="contained"
                                    sx={{ mt: 3, py: 1.25, fontWeight: 700 }}
                                >
                                    Sign In
                                </Button>
                            </Box>

                            {/* while syncing, the sync window above already shows this message */}
                            {alertContent && !isSyncing && <Box sx={{ mt: 2 }}>{signInAlert(alertContent)}</Box>}

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
                                First time on this device? Sign in with your BAHIS account while online to download your forms
                                and data for offline use.
                            </Typography>
                        </Box>
                    </Paper>
                </Box>
            </Box>
            <ChangeUserDialog open={openChangeUserDialog} handleClick={(event) => handleChangeUserConfirmation(event)} />
        </>
    );
};

import {
    AccountCircle as AccountCircleIcon,
    ArrowBack as ArrowBackIcon,
    Home as HomeIcon,
    Preview as PreviewIcon,
    Sync as SyncIcon,
    Update as UpdateIcon,
} from '@mui/icons-material';
import {
    Alert,
    AppBar,
    Badge,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Menu,
    MenuItem,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Toolbar,
    Typography,
} from '@mui/material';
import React, { Fragment, ReactElement, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { log } from '../helpers/log';
import { ipcRenderer } from 'electron';
import { useSelector } from 'react-redux';
import { fetchDraftCount, selectDraftCount } from '../stores/featues/draftCounterSlice.ts';
import { useAppDispatch } from '../stores/store.ts';
import { User } from '../app.model.ts';
import { OpenToast } from '../stores/featues/NotificationSlice.ts';
import logoWhite from '../assets/logo-white.png';

export const Header = () => {
    const [isWaitingForDataSync, setWaitingForDataSync] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [dialogEl, setDialogEl] = useState<ReactElement[]>([]);
    const [user, setUser] = useState<User>({});
    const [open, setOpen] = useState(false);
    const dispatch = useAppDispatch();
    const draftCount = useSelector(selectDraftCount);

    const handleLogout = () => {
        setAnchorEl(null);
        setOpen(false);
        navigate('/');
    };
    const logoutEl: ReactElement[] = [
        <Fragment key="logoutFragKey">
            <DialogTitle id="alert-dialog-title">{'Are you sure?'}</DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">Do you want to logout?</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleLogout}>Yes</Button>
                <Button onClick={() => setOpen(false)} autoFocus>
                    No
                </Button>
            </DialogActions>
        </Fragment>,
    ];

    const profileEl: ReactElement[] = [
        <Fragment key="profileFragKey">
            <DialogTitle id="alert-dialog-title">{'Profile'}</DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 300 }}>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>{user.name}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Username</TableCell>
                                    <TableCell>{user.username}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Upazila</TableCell>
                                    <TableCell>{user.upazila}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)} autoFocus>
                    Ok
                </Button>
            </DialogActions>
        </Fragment>,
    ];

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    const handleLogoutDialog = () => {
        setDialogEl(logoutEl);
        setAnchorEl(null);
        setOpen(true);
    };
    const handleProfile = () => {
        setDialogEl(profileEl);
        setAnchorEl(null);
        setOpen(true);
    };

    const navigate = useNavigate();

    useEffect(() => {
        ipcRenderer.invoke('get-user-data').then((res) => {
            if (res) {
                setUser(res);
            }
        });
        dispatch(fetchDraftCount());
    }, []);

    useEffect(() => {
        dispatch(fetchDraftCount());
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

    const handleUpdateAppData = () => {
        setWaitingForDataSync(true);
        ipcRenderer
            .invoke('request-app-data-sync')
            .then(() => {
                dispatch(OpenToast('Update data SUCCESS'));
            })
            .catch((error) => {
                dispatch(OpenToast({ type: 'error', text: 'Unable to update data' + error.message }));
            })
            .finally(() => {
                setWaitingForDataSync(false);
                log.info('App sync attempt complete. Navigating to menu.');
                navigate('/menu/0');
            });
    };

    const onBackHandler = () => {
        navigate(-1);
    };

    const onHomeHandler = () => {
        navigate('/menu/0');
    };

    const getButtonColor = () => {
        return draftCount === 0 ? 'info' : 'secondary';
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
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box display="flex" onClick={onHomeHandler}>
                        <Box
                            component="img"
                            src={logoWhite}
                            sx={{ display: { xs: 'none', md: 'flex' }, mr: 1, height: '2rem' }}
                        />
                        <Typography className="pr-4" variant="h4">
                            BAHIS
                        </Typography>
                    </Box>
                    <Box>
                        <Button color="inherit" onClick={onHomeHandler} startIcon={<HomeIcon />}>
                            Home
                        </Button>
                        <Button color="inherit" onClick={handleUpdateAppData} startIcon={<UpdateIcon />}>
                            Update Data
                        </Button>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Badge badgeContent={draftCount} color="warning">
                        <Button
                            variant="contained"
                            color="info"
                            onClick={() => navigate('list/drafts')}
                            disabled={isWaitingForDataSync}
                        >
                            <PreviewIcon />
                            Review Drafts
                        </Button>
                    </Badge>
                    <span className="mr-2"></span>
                    <Button
                        variant="contained"
                        color={getButtonColor()}
                        onClick={handleDraftSync}
                        disabled={isWaitingForDataSync}
                    >
                        <SyncIcon />
                        Sync Data
                    </Button>
                </Box>
                <Box sx={{ display: 'flex' }}>
                    <Button color="inherit" onClick={onBackHandler} startIcon={<ArrowBackIcon />}>
                        Back
                    </Button>
                    <div>
                        <Box sx={{ cursor: 'pointer' }} onClick={handleMenu}>
                            <IconButton
                                aria-label="account of current user"
                                aria-controls="menu-appbar"
                                aria-haspopup="true"
                                color="inherit"
                            >
                                <AccountCircleIcon />
                            </IconButton>
                            {user.username}
                        </Box>

                        <Menu
                            id="menu-profile"
                            anchorEl={anchorEl}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                        >
                            <MenuItem onClick={handleProfile}>Profile</MenuItem>
                            <MenuItem onClick={handleLogoutDialog}>Logout</MenuItem>
                        </Menu>
                    </div>
                </Box>
            </Toolbar>
            <Dialog open={open} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
                {dialogEl}
            </Dialog>
        </AppBar>
    );
};

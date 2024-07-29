import PreviewIcon from '@mui/icons-material/Preview';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import SyncIcon from '@mui/icons-material/Sync';
import AccountCircle from '@mui/icons-material/AccountCircle';
import {
    Alert,
    AppBar,
    Badge,
    Box,
    Button,
    CircularProgress,
    Snackbar,
    Toolbar,
    Menu,
    MenuItem,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
    TableContainer,
    Paper,
    Table,
    TableBody,
    TableRow,
    TableCell,
} from '@mui/material';
import { Fragment, ReactElement, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { log } from '../helpers/log';
import { ipcRenderer } from 'electron';
import { useSelector } from 'react-redux';
import { fetchDraftCount, selectDraftCount } from '../stores/featues/draftCounterSlice.ts';
import { useAppDispatch } from '../stores/store.ts';

interface User {
    username?: string;
    name?: string;
    upazila?: string;
}

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
        <Fragment key={123}>
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
        <Fragment key={321}>
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
                                <AccountCircle />
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

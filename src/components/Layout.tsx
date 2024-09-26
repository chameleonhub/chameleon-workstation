import { Container } from '@mui/material';
import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { log } from '../helpers/log';
import { Footer } from './Footer';
import { Header } from './Header';
import { SystemAlerts } from './SystemAlerts';
import { ipcRenderer } from 'electron';

const getLastSyncTime = async (override?: string | undefined) => {
    log.info(' setLastSyncTime (client) ');
    let time = new Date().toLocaleString();
    if (override) {
        time = override;
    }
    log.info(` setLastSyncTime SUCCESS: ${time} (client) `);
    return time;
};

export interface LayoutProps {
    hasHeader?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ hasHeader }) => {
    const navigate = useNavigate();

    const [lastSyncTime, setLastSyncTime] = React.useState<string>();

    useEffect(() => {
        getLastSyncTime().then((time) => setLastSyncTime(time));
        ipcRenderer.invoke('get-user-data').then((res) => {
            if (res) {
                const diffInDays = (Date.now() - Date.parse(res.last_login)) / (1000 * 3600 * 24);
                console.log(diffInDays);
                if (diffInDays <= 7) {
                    navigate('/menu/0');
                }
            }
        });
        ipcRenderer.on('log', (evt, msg) => {
            console.log(evt.ports);
            console.log(msg);
        });
    }, []);

    return (
        <>
            {hasHeader && <Header />}
            <SystemAlerts />
            <Container
                sx={{
                    height: '90%',
                    my: '1rem',
                    px: '3rem'
                }}
            >
                <Outlet />
            </Container>
            <Footer lastSyncTime={lastSyncTime} />
        </>
    );
};

Layout.defaultProps = {
    hasHeader: true,
};

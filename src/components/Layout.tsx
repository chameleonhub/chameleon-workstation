import { Container } from '@mui/material';
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { log } from '../helpers/log';
import { Footer } from './Footer';
import { Header } from './Header';
import { SystemAlerts } from './SystemAlerts';

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
    const [lastSyncTime, setLastSyncTime] = React.useState<string>();

    useEffect(() => {
        getLastSyncTime().then((time) => setLastSyncTime(time));
    }, []);

    return (
        <>
            {hasHeader && <Header />}
            <SystemAlerts />
            <Container
                sx={{
                    height: '90%',
                    my: '1rem',
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

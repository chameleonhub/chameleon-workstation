import { Alert, Box, Button, Card, CardContent, Grid, Icon, IconButton, Typography } from '@mui/material';
import { PushPin, PushPinOutlined } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { log } from '../../helpers/log';
import { ipcRenderer } from 'electron';
import { Link, useParams } from 'react-router-dom';
import { getPinnedModuleIds, togglePinnedModuleId } from '../../helpers/pinnedModules.ts';

enum MenuItemTypes {
    form = 1,
    list,
    module,
    iframe,
    submitted,
    dashboard,
}

interface MenuItem {
    id: number;
    title: string;
    icon: string;
    description: string | null;
    sort_order: number;
    parent_module: number;
    module_type: MenuItemTypes;
    form: number | null;
    external_url: string | null;
}

interface MenuButtonProps {
    menuItem: MenuItem;
    isPinned?: boolean;
    onTogglePin?: (id: number) => void;
}

export default function MenuButton(props: MenuButtonProps) {
    let url = '';
    if (props.menuItem.module_type === MenuItemTypes.module) {
        url = `/menu/${props.menuItem.id}/`;
    } else if (props.menuItem.module_type === MenuItemTypes.list) {
        url = `/list/${props.menuItem.form}/`;
    } else if (props.menuItem.module_type === MenuItemTypes.form) {
        url = `/form/${props.menuItem.form}/`;
    } else if (props.menuItem.module_type === MenuItemTypes.iframe) {
        url = `/iframe?url=${props.menuItem.external_url}`;
    } else if (props.menuItem.module_type === MenuItemTypes.submitted) {
        url = `/formlist/${props.menuItem.form}/`;
    } else if (props.menuItem.module_type === MenuItemTypes.dashboard) {
        url = `/dashboard/${props.menuItem.form}/`;
    }

    return (
        <Link to={url} style={{ textDecoration: 'none' }}>
            <Card
                sx={{
                    position: 'relative',
                    minWidth: 150,
                    height: 150,
                    margin: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    boxShadow: '3px 3px 5px 3px rgba(0,0,0,0.2)',
                }}
                className="hover:bg-gray-100"
            >
                {props.onTogglePin && (
                    <IconButton
                        size="small"
                        aria-label={props.isPinned ? 'Unpin from home' : 'Pin to home'}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            props.onTogglePin?.(props.menuItem.id);
                        }}
                        sx={{ position: 'absolute', top: 4, right: 4 }}
                    >
                        {props.isPinned ? <PushPin fontSize="small" color="primary" /> : <PushPinOutlined fontSize="small" />}
                    </IconButton>
                )}
                <CardContent>
                    <Typography variant="h6" color={'primary'}>
                        {props.menuItem.title}
                    </Typography>
                    <Icon fontSize="large" color={'primary'} sx={{ margin: 1 }}>
                        {props.menuItem.icon}
                    </Icon>
                    <Typography>{props.menuItem.description ?? ''}</Typography>
                </CardContent>
            </Card>
        </Link>
    );
}

// How many cards the Quick Access strip aims to show: pinned modules first, backfilled with the
// most-used forms (by combined draft + synced-submission count) up to this many.
const QUICK_ACCESS_TARGET = 5;

interface PersonalStats {
    thisMonth: number;
    allTime: number;
}

export const Menu = () => {
    const [menuModules, setmenuModules] = useState<MenuItem[]>([]);
    const [pinnedIds, setPinnedIds] = useState<number[]>(() => getPinnedModuleIds());
    const [quickAccessItems, setQuickAccessItems] = useState<MenuItem[]>([]);
    const [stats, setStats] = useState<PersonalStats | null>(null);

    const { menu_id } = useParams();
    log.info(`menu_id: ${menu_id}`);

    const isHome = !menu_id || menu_id === '0';

    const readModulesWithParent = (parent_module) => {
        log.info(`reading modules with parent_module: ${parent_module}`);
        let query = 'SELECT DISTINCT * FROM module WHERE parent_module';
        if (parent_module > 0) {
            query += ` = ${parent_module}`;
        } else {
            query += ' IS NULL';
        }
        ipcRenderer
            .invoke('get-local-db', query)
            .then((response) => {
                log.debug(`modules: ${JSON.stringify(response)}`);
                setmenuModules(response);
            })
            .catch((error) => {
                log.error(`Error reading modules: ${error}`);
            });
    };

    useEffect(() => {
        readModulesWithParent(menu_id);
    }, [menu_id]);

    // Quick Access: pinned modules (any type, resolved by id) shown first, backfilled with the
    // most-used forms up to QUICK_ACCESS_TARGET. Only loaded on the home screen (menu_id 0).
    useEffect(() => {
        if (!isHome) return;

        const pinnedQuery = pinnedIds.length > 0 ? `SELECT * FROM module WHERE id IN (${pinnedIds.join(',')})` : null;

        Promise.resolve(pinnedQuery ? ipcRenderer.invoke('get-local-db', pinnedQuery) : Promise.resolve([]))
            .then((pinnedModules: MenuItem[]) => {
                const remaining = QUICK_ACCESS_TARGET - pinnedModules.length;
                if (remaining <= 0) {
                    setQuickAccessItems(pinnedModules);
                    return;
                }

                const excludeIds = pinnedIds.length > 0 ? pinnedIds.join(',') : '0';
                const mostUsedQuery = `
                    SELECT module.* FROM module
                    INNER JOIN (
                        SELECT form_uid, COUNT(*) as cnt FROM (
                            SELECT form_uid FROM formcloudsubmission
                            UNION ALL
                            SELECT form_uid FROM formlocaldraft
                        ) GROUP BY form_uid
                    ) usage ON module.form = usage.form_uid
                    WHERE module.module_type = 1 AND module.id NOT IN (${excludeIds})
                    ORDER BY usage.cnt DESC
                    LIMIT ${remaining}
                `;
                return ipcRenderer.invoke('get-local-db', mostUsedQuery).then((mostUsedModules: MenuItem[]) => {
                    setQuickAccessItems([...pinnedModules, ...mostUsedModules]);
                });
            })
            .catch((error) => {
                log.error(`Error reading Quick Access modules: ${error}`);
            });
    }, [isHome, pinnedIds]);

    // Personal stats: reports synced this calendar month vs. all-time, from this device's own
    // formcloudsubmission table - there's no visibility into other agents' data from this client.
    useEffect(() => {
        if (!isHome) return;

        const query = `
            SELECT
                (SELECT COUNT(*) FROM formcloudsubmission) as allTime,
                (SELECT COUNT(*) FROM formcloudsubmission WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')) as thisMonth
        `;
        ipcRenderer
            .invoke('get-local-db', query)
            .then((response: PersonalStats[]) => {
                if (response[0]) setStats(response[0]);
            })
            .catch((error) => {
                log.error(`Error reading personal stats: ${error}`);
            });
    }, [isHome]);

    const handleTogglePin = (id: number) => {
        setPinnedIds(togglePinnedModuleId(id));
    };

    return (
        <>
            {/*
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
                    Latest Improvements
                </AccordionSummary>
                <AccordionDetails>
                    <ul>
                        <li>
                            (2023-08-17) Previously some data was not pulled to the app if a synchronisation request failed,
                            now the application will retry the request up to 5 times if a request fails.
                        </li>
                        <li>
                            (2023-08-17) Previously newly entered data could be deleted after a failed sync; this has been
                            resolved.
                        </li>
                        <li>
                            (2023-08-17) We have improved the synchronisation message system: now the synchronizing message
                            will close only at the end of a sync and there are new animations on the message. The count of not
                            synced data will also show on top of the sync button.
                        </li>
                        <li>
                            (2023-08-07) It was hard to tell exactly how well a new roll-out of bahis-desk had been so we have
                            added the ability to track which version of the desktop app is being used in the field.
                        </li>
                        <li>(2023-06-23) We now how automated semantic versioning for an improved release cycle.</li>
                        <li>
                            (2023-05-25) The Geoinformation and Form Summary pages had no search feature and so were difficult
                            to use - we have added search features to both pages.
                        </li>
                        <li>(2023-03-29) Buitl and released bahis-dash v1!</li>
                        <li>
                            (2023-03-28) When users sign in from bahis-desk they used to have the entire branch catchment
                            returned to them but no upazila (which was later inferred from the whole catchment every time it
                            was needed); we now don&apos;t send the catchment (as users already have this) and do send the
                            upazila (so it no longer needs to be determined over and over again) - importantly this limits
                            login to accounts that have been correctly assigned as an upazila.
                        </li>
                        <li>
                            (2023-03-22) When forms were being updated, bahis-desk was not recognising this unless the parent
                            module was also updated. This has now been corrected.
                        </li>
                        <li>
                            (2023-03-21) Previously users were being asked to fill out mouza every time they filled out any
                            form; however, nobody was using this as union is enough granularity and so we have removed this
                            from all forms.
                        </li>
                        <li>
                            (2023-03-07) When synchronising new form submissions, clicking &quot;sync now&quot; twice in a row
                            was creating local duplications due to timestamp discrepancies. In this version, there will be no
                            duplicated entry as we always default to the version kept on the central server.
                        </li>
                        <li>
                            (2023-02-23) When editing a form that had been submitted but not synchronised, clicking
                            &quot;submit&quot; in the edit window was creating a local duplicate of that submission. In this
                            version, there will be no locally duplicated entries.
                        </li>
                        <li>
                            (2023-01-24) Previously there was no auto-fill for geolocations (division, district, and upazila),
                            the geolocation fields have been hidden from users, and now it is auto filling in the back.
                        </li>
                    </ul>
                </AccordionDetails>
            </Accordion>
     */}

            {isHome && (
                <Box sx={{ marginTop: 2 }}>
                    {stats && (
                        <Card sx={{ display: 'inline-block', padding: 1, marginBottom: 1 }}>
                            <CardContent sx={{ display: 'flex', gap: 3, '&:last-child': { paddingBottom: 1 } }}>
                                <Box>
                                    <Typography variant="h5" color="primary">
                                        {stats.thisMonth.toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        reports this month
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h5" color="primary">
                                        {stats.allTime.toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        reports all-time
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    )}
                    {quickAccessItems.length > 0 && (
                        <>
                            <Typography variant="subtitle1" color="text.secondary">
                                Quick Access
                            </Typography>
                            <Grid container>
                                {quickAccessItems.map((menuItem) => (
                                    <Grid key={'quick-' + menuItem.id} size={{ lg: 3, md: 4, sm: 6, xs: 12 }}>
                                        <MenuButton
                                            menuItem={menuItem}
                                            isPinned={pinnedIds.includes(menuItem.id)}
                                            onTogglePin={handleTogglePin}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        </>
                    )}
                </Box>
            )}

            <Grid container sx={{ marginTop: 2 }}>
                {menuModules.length > 0 ? (
                    menuModules.map((menuItem) => (
                        <Grid
                            key={'menu-' + menuItem.id}
                            style={{ order: menuItem.sort_order }}
                            size={{ lg: 3, md: 4, sm: 6, xs: 12 }}
                        >
                            <MenuButton
                                menuItem={menuItem}
                                isPinned={pinnedIds.includes(menuItem.id)}
                                onTogglePin={handleTogglePin}
                            />
                        </Grid>
                    ))
                ) : (
                    <Alert
                        severity="error"
                        action={
                            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                                REFRESH
                            </Button>
                        }
                    >
                        No modules found - try refreshing the app.
                    </Alert>
                )}
            </Grid>
        </>
    );
};

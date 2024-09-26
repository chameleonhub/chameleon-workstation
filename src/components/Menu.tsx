import {Alert, Button, Card, CardContent, Grid, Icon, Typography} from '@mui/material';
import {useEffect, useState} from 'react';
import {log} from '../helpers/log';
import {ipcRenderer} from 'electron';
import {Link, useParams} from 'react-router-dom';

enum MenuItemTypes {
    form = 1,
    list,
    module,
    iframe,
    submitted,
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
    }

    return (
        <Link to={url} style={{textDecoration: 'none'}}>
            <Card
                sx={{
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
                <CardContent>
                    <Typography variant="h6" color={'primary'}>
                        {props.menuItem.title}
                    </Typography>
                    <Icon fontSize="large" color={'primary'} sx={{margin: 1}}>
                        {props.menuItem.icon}
                    </Icon>
                    <Typography>{props.menuItem.description ?? ''}</Typography>
                </CardContent>
            </Card>
        </Link>
    );
}

export const Menu = () => {
    const [menuModules, setmenuModules] = useState<MenuItem[]>([]);

    const {menu_id} = useParams();
    log.info(`menu_id: ${menu_id}`);

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

            <Grid container sx={{marginTop: 2}}>
                {menuModules.length > 0 ? (
                    menuModules.map((menuItem) => (
                        <Grid
                            item
                            key={'menu-' + menuItem.id}
                            style={{order: menuItem.sort_order}}
                            lg={3}
                            md={4}
                            sm={6}
                            xs={12}
                        >
                            <MenuButton menuItem={menuItem}/>
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

import axios from 'axios';
import csv from 'csv-parser';
import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import { installExtension, REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import firstRun from 'electron-first-run'; // could this eventually be removed too?
import { autoUpdater, UpdateDownloadedEvent } from 'electron-updater';
import { createReadStream } from 'fs';
import path from 'node:path';
import { create } from 'xmlbuilder2';
import { createLocalDatabase, createOrReadLocalDatabase, createUserInLocalDatabase, deleteLocalDatabase } from './localDB';
import { log, rendererLog } from './log';
import {
    BAHIS_SERVER_URL,
    getAdministrativeRegions,
    getFormCloudSubmissions,
    getForms,
    getModules,
    getTaxonomies,
    getWorkflows,
    postFormCloudSubmissions,
} from './sync';
import { UserData } from './bahis.model.ts';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { endSyncProgress, startSyncProgress, Toast } from './utils.ts';

// SETUP
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
process.env.DIST = path.join(__dirname, '..');
process.env.PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

const APP_VERSION = app.getVersion();
const BAHIS2_SERVER_URL = import.meta.env.VITE_BAHIS2_SERVER_URL || 'http://localhost:80';

// default environment variables, i.e. for local development
export const MODE = import.meta.env.MODE || 'development';
process.env.NODE_ENV = MODE as typeof process.env.NODE_ENV;

// set environment variables based on mode
switch (MODE) {
    case 'development':
        log.info('Running in dev mode');
        log.transports[0].level = 'silly'; // console
        log.transports[1].level = 'silly'; // file

        app.disableHardwareAcceleration(); // hardware acceleration can break hot reloading on AMD GPUs
        break;
    case 'production':
        log.info('Running in production mode');
        log.transports[0].level = 'warn'; // console
        log.transports[1].level = 'info'; // file
        break;
    default:
        log.error(`Unknown mode: ${MODE}`);
        break;
}

// logging setup
autoUpdater.logger = log;
log.info(`Using the following log settings: console=${log.transports[0].level}; file=${log.transports[1].level}}`);
log.info(`Full debug logs can be found in ${path.join(process.env.DIST, 'electron-debug.log')}`);

// MIGRATION
// The following code migrates user data from bahis-desk <=v2.3.0
// to a new location used in later version (in preparation for v3.0)
// This code can be removed once we are confident that all users have upgraded to v3.0
// const migrate = (old_app_location) => {
//     if (existsSync(old_app_location)) {
//         log.warn(`Migrating user data from old location: ${old_app_location}`);
//         log.debug(`Old location: ${old_app_location}`);
//         log.debug(`New location: ${app.getPath('userData')}`);
//         cp(old_app_location, app.getPath('userData'), { recursive: true }, (error) => {
//             log.error('Failed to migrate user data from old location');
//             log.error(error);
//         });
//     }
// };
// switch (MODE) {
//     case 'development':
//         migrate(path.join(app.getPath('userData'), '..', 'devbahis/'));
//         break;
//     case 'production':
//         migrate(path.join(app.getPath('userData'), '..', 'bahis/'));
//         break;
//     default:
//         log.error(`Unknown mode: ${MODE}`);
//         break;
// }

// report the status of environment variables and logging
log.info(`Running version ${APP_VERSION} in ${MODE} mode with the following environment variables:`);
log.info(`BAHIS2_SERVER_URL=${BAHIS2_SERVER_URL}`);
log.info(`BAHIS_SERVER_URL=${BAHIS_SERVER_URL} (BAHIS 3)`);

// Initialise local DB
let db = createOrReadLocalDatabase(MODE);

export let mainWindow: BrowserWindow | null;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    app.exit(0);
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();
        }
    });
}

const createWindow = () => {
    log.info('created window');

    mainWindow = new BrowserWindow({
        width: 900,
        height: 680,
        icon: path.join(process.env.PUBLIC as string, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    if (process.env['VITE_DEV_SERVER_URL']) {
        mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL']);

        // vite-plugin-electron starts this window as soon as the dev server's port is listening,
        // which can race Vite's first dependency-optimizer pass - a module request landing in that
        // gap fails with a raw, unrecoverable "504 (Outdated Optimize Dep)" console error (the
        // browser's native ES module loader has no retry/reload logic like @vite/client's HMR path
        // does). Reloading once the optimizer is done recovers cleanly; retry (debounced) in case the
        // reload itself lands in the same gap again.
        let lastReload = 0;
        mainWindow.webContents.on('console-message', (event) => {
            if (event.message.includes('Outdated Optimize Dep') && Date.now() - lastReload > 2000) {
                lastReload = Date.now();
                log.warn('Detected stale Vite optimize-dep response on startup, reloading window');
                mainWindow?.webContents.reloadIgnoringCache();
            }
        });
    } else {
        mainWindow.loadFile(path.join(process.env.DIST as string, 'index.html'));
    }

    mainWindow.maximize();

    if (MODE === 'development') {
        mainWindow.webContents.openDevTools();
    }

    //what does that do?
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

const autoUpdateBahis = () => {
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'chameleonhub',
        repo: 'chameleon-workstation',
    });

    log.info('Checking for the app software updates call');
    if (MODE !== 'development') {
        autoUpdater.checkForUpdatesAndNotify();
    } else {
        log.info('Not checking for updates in dev mode');
    }
};

export async function getToken() {
    const token = await db.prepare('SELECT token from users limit 1').get();
    if (token) {
        return token.token;
    } else {
        return false;
    }
}

/** adds window on app if window null */
app.whenReady().then(() => {
    const isFirstRun = firstRun();
    if (!isFirstRun) {
        //we don't check for auto update on the first run, apparently that can cause problems
        autoUpdateBahis();
    }

    if (MODE === 'development') {
        // installExtension can throw synchronously (e.g. no network access to the Chrome Web
        // Store); since this whole app.whenReady().then() callback has no .catch(), an uncaught
        // synchronous throw here would abort createWindow() below and the app would exit with no
        // window and no error - wrap it so a broken devtools install never takes down the app.
        try {
            installExtension(REACT_DEVELOPER_TOOLS)
                .then((extension) => log.info(`Added DevTools extension: ${extension.name}`))
                .catch((error) => log.error('Failed to install DevTools extension: ', error));
        } catch (error) {
            log.error('Failed to install DevTools extension: ', error);
        }
    }

    createWindow();
});

app.on('window-all-closed', () => {
    mainWindow = null;
    db.close();
    app.quit();
});

const isMac = process.platform === 'darwin';

const template: Electron.MenuItemConstructorOptions[] = [
    // { role: 'fileMenu' }
    {
        label: 'File',
        submenu: [
            {
                label: 'Reset database',
                click: () => {
                    const browserWindow = BrowserWindow.getFocusedWindow();
                    if (browserWindow) {
                        const status = dialog.showMessageBoxSync(browserWindow, {
                            title: 'Confirm',
                            message: `Are you sure?`,
                            type: 'warning',
                            buttons: ['Yes', 'Cancel'],
                            cancelId: 1,
                            noLink: true,
                        });
                        if (status === 0) {
                            mainWindow?.webContents.send('init-refresh-database');
                        }
                    }
                },
            },
            {
                label: 'Sync app data',
                click: () => {
                    getAppData({
                        type: 'manual-sync',
                    });
                },
            },
            {
                label: 'Manually update app',
                click: () => {
                    try {
                        autoUpdater.checkForUpdatesAndNotify();
                    } catch (error) {
                        log.error('Manual update app FAILED with:');
                        log.error(error);
                        const browserWindow = BrowserWindow.getFocusedWindow();
                        if (browserWindow) {
                            dialog.showMessageBox(browserWindow, {
                                title: 'Update failed',
                                message: `Update failed with ${error}`,
                                type: 'warning',
                            });
                        }
                    }
                },
            },
            isMac ? { role: 'close' } : { role: 'quit' },
        ],
    },
    // { role: 'viewMenu' }
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
        ],
    },
    // { role: 'helpMenu' }
    {
        label: 'Help',
        submenu: [
            {
                label: 'About',
                click: () => {
                    const browserWindow = BrowserWindow.getFocusedWindow();
                    if (browserWindow) {
                        return dialog.showMessageBox(browserWindow, {
                            title: 'About BAHIS',
                            message: `
                                BAHIS
                                Version ${APP_VERSION}.
                                
                                Powered By Chameleon
                                `,
                            type: 'info',
                        });
                    }
                },
            },
        ],
    },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

/** DEVNOTE
 * There are five scenarios in sign in process
 * 1. First, we check if the user exists in the local database with the correct password
 * if so, we let them sign in (offline-user-success)
 * 2. If the user exists in the local database but the password is incorrect,
 * we show an error message to the user (offline-user-fail)
 * 3. However, if the user conflicts with that in the local database,
 * we show the ChangeUserDialog and confirm resetting the database before... (change-user)
 * 4. Else, we send a request to the server to verify the user and, if the request suceeds,
 * we update the local database with the user's information
 * and let them sign in (fresh-user-success)
 * 5. Finally, if this request fails we show an error message to the user (fresh-user-fail)
 */
const signIn = async (event, userData: UserData) => {
    log.info(`Attempting electron-side signIn for ${userData.username}`);
    log.debug(event);

    //change login to bahis3
    const SIGN_IN_ENDPOINT = `${BAHIS_SERVER_URL}/api/auth/`;
    const current_user = db.prepare('SELECT * from users limit 1').get();

    if (current_user) {
        db.prepare(
            `UPDATE users
             SET last_login = CURRENT_TIMESTAMP
             WHERE username = ?;`,
        ).run(current_user.username);
        log.info(`User exists in the current database - ${current_user.username}`);
    }

    if (current_user && userData && current_user.username == userData.username && current_user.password == userData.password) {
        log.info('This is an offline-ready account.');

        const data = {
            username: userData.username,
            password: userData.password,
            bahis_desk_version: APP_VERSION,
        };

        axios.post(SIGN_IN_ENDPOINT, data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return 'offline-user-success';
    } else if (
        current_user &&
        userData &&
        current_user.username === userData.username &&
        current_user.password !== userData.password
    ) {
        log.info('This is an offline-ready account but the credentials are incorrect.');
        return 'offline-user-fail';
    } else if (current_user && userData && current_user.username !== userData.username) {
        log.info('Change of user requested - handing back for confirmation.');
        return 'change-user';
    } else {
        log.info('Attempt to sign in to the BAHIS server');
        const data = {
            username: userData.username,
            password: userData.password,
            bahis_desk_version: APP_VERSION,
        };
        log.info(`signin url: ${SIGN_IN_ENDPOINT}`);

        return await axios
            .post(SIGN_IN_ENDPOINT, data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            .then((response) => {
                if (response.status === 200 && response.data.user.username === userData.username) {
                    log.info('BAHIS server sign in received a 200 response');

                    createUserInLocalDatabase(response.data, userData, db);
                    log.info('Local db configured');

                    return 'fresh-user-success';
                } else {
                    log.info('BAHIS server sign in received a non-200 response');
                    return 'fresh-user-fail';
                }
            })
            .catch((error) => {
                console.error(error.message);
                log.error('Sign In Error');
                if (error.response) {
                    return 'unauthorized';
                } else if (error.code === 'ENOTFOUND') {
                    return 'disconnected';
                } else {
                    return 'error';
                }
            });
    }
};

interface usernameObject {
    username: string;
}

const fetchUsername = (event, infowhere) => {
    // TODO refactor / write this for new BAHIS 3 auth
    log.info(`fetchUsername: ${infowhere}`);
    try {
        const fetchedUsername = db.prepare('SELECT username from users limit 1').get() as usernameObject;

        log.info('XIM2, we fetched', JSON.stringify(fetchedUsername));
        event.returnValue = {
            username: fetchedUsername.username,
        };
        log.info('fetchUsername SUCCESS');
    } catch (error) {
        log.error('fetchUsername FAILED with:');
        log.error(error);
    }
};

const readUserAdministrativeRegion = async (event, args) => {
    log.info('READ user administrative region from local DB');
    log.debug(`due to ${event.type}`);
    log.debug(`with args: ${args}`);

    return new Promise<object>((resolve, reject) => {
        try {
            const userAdministrativeRegionQuery = `SELECT upazila
                                                   FROM users`;
            let administrativeRegionID = db.prepare(userAdministrativeRegionQuery).get().upazila; // FIXME replace when moving to BAHIS 3 user systems
            const queryForLevel = db.prepare('SELECT administrative_region_level FROM administrativeregion WHERE id IS ?');
            const queryForNextLevelUp = db.prepare(
                'SELECT parent_administrative_region FROM administrativeregion WHERE id IS ?',
            );
            const queryForName = db.prepare('SELECT title FROM administrativeregion WHERE id IS ?');

            const currentLevel = queryForLevel.get(administrativeRegionID).administrative_region_level;

            const userAdministrativeRegionInfo = {};
            if (args === 'asName') {
                const administrativeRegionName = queryForName.get(administrativeRegionID).title;
                userAdministrativeRegionInfo[currentLevel] = administrativeRegionName;
            } else {
                userAdministrativeRegionInfo[currentLevel] = administrativeRegionID;
            }

            for (let i = currentLevel - 1; i > 0; i--) {
                administrativeRegionID = queryForNextLevelUp.get(administrativeRegionID).parent_administrative_region;
                if (args === 'asName') {
                    const administrativeRegionName = queryForName.get(administrativeRegionID).title;
                    userAdministrativeRegionInfo[i] = administrativeRegionName;
                } else {
                    userAdministrativeRegionInfo[i] = administrativeRegionID;
                }
            }

            if (userAdministrativeRegionInfo !== undefined) {
                log.info(`READ user administrative region SUCCESS ${JSON.stringify(userAdministrativeRegionInfo)}`);
                resolve(userAdministrativeRegionInfo);
            } else {
                log.warn('READ user administrative region FAILED - undefined');
            }
        } catch (error) {
            log.error('READ user administrative region FAILED with:');
            log.error(error);
            reject(error);
        }
    });
};

const getLocalDB = async (event, query) => {
    log.info(`GET from local DB with query: ${query}`);
    log.debug(`due to ${event.type}`);

    return new Promise<string>((resolve, reject) => {
        try {
            const fetchedRows = db.prepare(query).all();
            log.info('GET from local DB SUCCESS');
            resolve(fetchedRows);
        } catch (error) {
            log.error('GET from local DB FAILED with:');
            log.error(error);
            reject(error);
        }
    });
};

const postLocalDB = async (event, query) => {
    log.info(`POST to local DB with query: ${query}`);
    log.debug(`due to ${event.type}`);

    return new Promise<boolean>((resolve, reject) => {
        try {
            db.prepare(query).run();
            log.info('POST to local DB SUCCESS');
            resolve(true);
        } catch (error) {
            log.error('POST to local DB FAILED with');
            log.error(error);
            reject(error);
        }
    });
};

// Formats a count with its label, e.g. _plural(1, 'form') -> "1 form", _plural(3, 'form') -> "3 forms" -
// used to build the human-readable "N synced" summary Toast shown after a sync completes.
const _plural = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;

const getAppData = async (event) => {
    log.info('GET app data from server');
    log.debug(`due to ${event.type}`);

    startSyncProgress();
    return await Promise.all([
        getModules(db),
        getWorkflows(db),
        getForms(db).then(async (formsCount) => ({ formsCount, recordsCount: await getFormCloudSubmissions(db) })),
        getTaxonomies(db),
        getAdministrativeRegions(db),
    ])
        .then(([modulesCount, workflowsCount, { formsCount, recordsCount }, taxonomiesCount, adminRegionsCount]) => {
            log.info('GET app data SUCCESS');
            const summary = [
                _plural(modulesCount, 'module'),
                _plural(workflowsCount, 'workflow'),
                _plural(formsCount, 'form'),
                _plural(recordsCount, 'record'),
                _plural(taxonomiesCount, 'taxonomy', 'taxonomies'),
                _plural(adminRegionsCount, 'administrative region'),
            ].join(', ');
            Toast(`Sync complete: ${summary}`, 'success', 8000);
            return true;
        })
        .catch((error) => {
            log.error('GET app data FAILED with:');
            log.error(error);
            throw error;
        })
        .finally(() => {
            endSyncProgress();
        });
};

const postGetUserData = async (event) => {
    log.info('POST local data to server');
    log.debug(`due to ${event.type}`);

    startSyncProgress();
    try {
        // BAHIS 3 data
        const uploadedCount = await postFormCloudSubmissions(db);
        const recordsCount = await getFormCloudSubmissions(db);
        const summary = [_plural(uploadedCount, 'draft'), _plural(recordsCount, 'record')].join(', ');
        Toast(`Sync complete: ${summary} synced`, 'success', 8000);
    } finally {
        endSyncProgress();
    }
};

const readAdministrativeRegions = async (event) => {
    log.info(`READ administrative regions from local DB`);
    log.debug(`due to ${event.type}`);

    const query =
        'SELECT id AS name, title AS label, administrative_region_level AS administrative_region_level FROM administrativeregion';
    const response = db.prepare(query).all();

    return new Promise<string>((resolve, reject) => {
        try {
            const doc = create({ version: '1.0' }).ele('root');
            response.forEach((row) => {
                const item = doc.ele('item');
                Object.keys(row).forEach((key) => {
                    item.ele(key).txt(row[key]);
                });
            });

            const xmlString = doc.root().toString({ prettyPrint: false });
            log.info('READ administrative regions SUCCESS');
            resolve(xmlString);
        } catch (error) {
            log.error('READ administrative regions FAILED with:');
            log.error(error);
            reject(error);
        }
    });
};

// Reads a CSV file and converts it to the <root><item><col>val</col>...</item>...</root> XML
// shape enketo-core's pulldata() support expects at instance('slug')/root/item.
const csvFileToItemsXML = (filePath: string): Promise<string> => {
    const data: object[] = [];
    return new Promise<string>((resolve, reject) => {
        // pipe() does not forward 'error' events from the source stream to the destination, so the
        // fs ReadStream needs its own 'error' listener - otherwise an ENOENT (or other read error)
        // has no listener, which Node treats as an uncaught exception and crashes the main process.
        createReadStream(filePath)
            .on('error', reject)
            .pipe(csv())
            .on('data', (row: object) => data.push(row))
            .on('end', () => {
                const doc = create({ version: '1.0' }).ele('root');

                data.forEach((row) => {
                    const item = doc.ele('item');
                    Object.keys(row).forEach((key) => {
                        item.ele(key).txt(row[key]);
                    });
                });

                resolve(doc.root().toString({ prettyPrint: false }));
            })
            .on('error', reject);
    });
};

const readTaxonomy = async (event, taxonomySlug: string) => {
    log.info(`READ ${taxonomySlug} taxonomy CSV`);
    log.debug(`due to ${event.type}`);

    const query = `SELECT csv_file
                   FROM taxonomy
                   where slug = '${taxonomySlug}'`;
    const response = db.prepare(query).get();
    const filePath = `${app.getPath('userData')}/${response.csv_file}`;

    log.info(`Reading taxonomy CSV at ${filePath}`);
    return csvFileToItemsXML(filePath)
        .then((xmlString) => {
            log.info(`READ taxonomy CSV at ${filePath} SUCCESS`);
            return xmlString;
        })
        .catch((error) => {
            log.error(`READ taxonomy CSV at ${filePath} FAILED with:`);
            log.error(error);
            Toast(`Unable to load ${taxonomySlug} choices - try syncing app data again`, 'error');
            throw error;
        });
};

const readFormMedia = async (event, formUid: string, filename: string) => {
    log.info(`READ form media ${formUid}/${filename}`);
    log.debug(`due to ${event.type}`);

    // filename is parsed from a synced form's own <instance src="jr://file-csv/...">, so
    // path.basename() guards against a '..'-containing value escaping the formmedia directory.
    const filePath = `${app.getPath('userData')}/formmedia/${formUid}/${path.basename(filename)}`;

    log.info(`Reading form media CSV at ${filePath}`);
    return csvFileToItemsXML(filePath)
        .then((xmlString) => {
            log.info(`READ form media CSV at ${filePath} SUCCESS`);
            return xmlString;
        })
        .catch((error) => {
            log.error(`READ form media CSV at ${filePath} FAILED with:`);
            log.error(error);
            Toast(`Unable to load ${filename} choices - try syncing app data again`, 'error');
            throw error;
        });
};

const refreshDatabase = async () => {
    log.info('Refreshing database');
    try {
        deleteLocalDatabase(MODE, db);
        db = createLocalDatabase(MODE);
        return 'success';
    } catch (e) {
        console.log(e);
        return 'failed';
    }
};

const readAppVersion = async (event) => {
    log.info(`READ app version`);
    log.debug(`due to ${event.type}`);

    return new Promise<string>((resolve, reject) => {
        try {
            log.info(`READ app version SUCCESS`);
            resolve(APP_VERSION);
        } catch (error) {
            log.error('READ app version FAILED with:');
            log.error(error);
            reject(error);
        }
    });
};

const getUserData = async () => {
    const currentUser = db.prepare('SELECT * from users limit 1').get() as usernameObject;
    if (currentUser) {
        return currentUser;
    } else {
        return false;
    }
};

// subscribes the listeners to channels
//original
ipcMain.on('fetch-username', fetchUsername);
ipcMain.on('renderer-log', (_event, level: string, message: string) => rendererLog.log(level, message));

// refactored & new
ipcMain.handle('sign-in', signIn);
ipcMain.handle('request-app-data-sync', getAppData);
ipcMain.handle('request-user-data-sync', postGetUserData);
ipcMain.handle('refresh-database', refreshDatabase);

ipcMain.handle('get-local-db', getLocalDB);
ipcMain.handle('post-local-db', postLocalDB);
ipcMain.handle('request-module-sync', getModules);
ipcMain.handle('request-workflow-sync', getWorkflows);
ipcMain.handle('request-form-sync', getForms);
ipcMain.handle('request-taxonomy-sync', getTaxonomies);
ipcMain.handle('request-administrative-region-sync', getAdministrativeRegions);
ipcMain.handle('read-taxonomy-data', readTaxonomy);
ipcMain.handle('read-form-media-data', readFormMedia);
ipcMain.handle('read-administrative-region-data', readAdministrativeRegions);
ipcMain.handle('read-user-administrative-region', readUserAdministrativeRegion);
ipcMain.handle('read-app-version', readAppVersion);
ipcMain.handle('get-user-data', getUserData);

function createUpdateDialog(htmlContent: string) {
    const updateWindow = new BrowserWindow({
        width: 450,
        height: 500,
        modal: true,
        resizable: false,
        minimizable: false,
        // frame: false,
        autoHideMenuBar: true,
        icon: path.join(process.env.PUBLIC as string, 'icon.png'),
        parent: mainWindow!,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
        },
    });

    let updateHtmlPath: string;

    if (MODE === 'production') {
        updateHtmlPath = path.resolve('./public/update.html');
    } else {
        updateHtmlPath = path.join(__dirname, '../public/update.html');
    }

    updateWindow.loadFile(updateHtmlPath).catch((err) => {
        console.error('Failed to load update.html:', err);
        updateWindow.close();
    });

    ipcMain.handle('get-release-notes', () => {
        return htmlContent;
    });

    return updateWindow;
}

autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
    const htmlContent =
        process.platform === 'win32'
            ? `<h3 class="release-name">${event.releaseName}</h3><div>${event.releaseNotes}</div>`
            : `<p>${event.releaseName}</p>`;

    const updateDialog = createUpdateDialog(htmlContent);

    ipcMain.on('restart-app', () => {
        updateDialog.close();
        autoUpdater.quitAndInstall();
    });

    ipcMain.on('close-dialog', () => {
        updateDialog.close();
    });
});

autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    Toast(
        'A new update is available. When prompted with the Update dialog, click "Update" and confirm by selecting "Yes" to apply the update.',
        'info',
        10000,
    );
});

import Database from 'better-sqlite3';
import { app } from 'electron';
import { existsSync, unlinkSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { log } from './log';

// 2023-08-21 the following options are a fix for using rollup (within vite) with better-sqlite3
const __filename = fileURLToPath(import.meta.url);
const requireMe = createRequire(pathToFileURL(__filename).href);
const addon = requireMe(
    path.resolve('./node_modules/better-sqlite3/build/Release/better_sqlite3.node').replace(/(\.node)?$/, '.node'),
);

const DB_PATH = (MODE) => path.join(app.getPath('userData'), `bahis_${MODE}.db`);

export const createLocalDatabase = (MODE) => {
    log.info(`CREATE clean local database at ${DB_PATH(MODE)}`);
    const db = new Database(DB_PATH(MODE), { nativeBinding: addon });

    log.info('Running initialisation');
    try {
        initialiseDBTables(db);
        log.info('Running initialisation SUCCESS');
    } catch (error) {
        log.error('Running initialisation FAILED');
        log.error(error);
    }

    log.info('CREATE clean local database FINSIHED');
    return db;
};

export const createOrReadLocalDatabase = (MODE) => {
    log.info(`Checking if local database exists at ${DB_PATH(MODE)}`);
    let db;
    if (!existsSync(DB_PATH(MODE))) {
        db = createLocalDatabase(MODE);
    } else {
        log.info(`Using existing local database at ${DB_PATH(MODE)}`);
        db = new Database(DB_PATH(MODE), { nativeBinding: addon });
    }

    return db;
};

export const createUserInLocalDatabase = async (data, userData, db) => {
    const insertStmt = db.prepare(`INSERT INTO users (username, password, name, token, upazila)
                                   VALUES (?, ?, ?, ?, ?)`);
    insertStmt.run(data.user.username, userData.password, data.user.name, data.token, data.upazila);

    log.info(`Created db with user details for ${data.user_name}`);
};

export const deleteLocalDatabase = (MODE, db) => {
    log.info(`Deleting local database at ${DB_PATH(MODE)}`);
    db.close();
    unlinkSync(DB_PATH(MODE));
};

export const initialiseDBTables = (db) => {
    initialiseDBModulesTable(db);
    initialiseDBWorkflowsTable(db);
    initialiseDBFormsTable(db);
    initialiseDBFormLocalDraftsTable(db);
    initialiseDBFormCloudSubmissionsTable(db);
    initialiseDBTaxonomiesTable(db);
    initialiseDBAdministrativeRegionsTable(db);
    initialiseUserTable(db);
};

const initialiseDBModulesTable = (db) => {
    log.info('Creating module table');
    db.prepare(
        'CREATE TABLE module (\
        id INTEGER NOT NULL PRIMARY KEY,\
        title TEXT NOT NULL,\
        icon TEXT NULL,\
        description TEXT NULL,\
        form TEXT NULL,\
        external_url TEXT NULL,\
        sort_order INTEGER NOT NULL,\
        parent_module INTEGER NULL,\
        module_type INTEGER NOT NULL\
    );',
    ).run();
};

const initialiseDBWorkflowsTable = (db) => {
    log.info('Creating workflow table');
    db.prepare(
        'CREATE TABLE workflow (\
        id INTEGER NOT NULL PRIMARY KEY,\
        title TEXT NOT NULL,\
        source_form TEXT NULL,\
        destination_form TEXT NULL,\
        definition TEXT NOT NULL\
    );',
    ).run();
};

const initialiseDBFormsTable = (db) => {
    log.info('Creating form table');
    db.prepare(
        'CREATE TABLE form (\
        uid TEXT NOT NULL PRIMARY KEY,\
        name TEXT NOT NULL,\
        description TEXT NULL,\
        xml TEXT NOT NULL\
    );',
    ).run();
};

const initialiseDBFormLocalDraftsTable = (db) => {
    log.info('Creating formlocaldraft table');
    db.prepare(
        'CREATE TABLE formlocaldraft (\
        uuid TEXT NOT NULL PRIMARY KEY,\
        form_uid TEXT NOT NULL,\
        xml TEXT NULL\
    );',
    ).run();
};

const initialiseDBFormCloudSubmissionsTable = (db) => {
    log.info('Creating formcloudsubmission table');
    db.prepare(
        'CREATE TABLE formcloudsubmission (\
        uuid TEXT NOT NULL PRIMARY KEY,\
        form_uid TEXT NOT NULL,\
        xml TEXT NOT NULL,\
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\
    );',
    ).run();
};

const initialiseDBTaxonomiesTable = (db) => {
    log.info('Creating taxonomy table');
    db.prepare(
        'CREATE TABLE taxonomy (\
        slug TEXT NOT NULL PRIMARY KEY,\
        csv_file TEXT NOT NULL\
    );',
    ).run();
};

const initialiseDBAdministrativeRegionsTable = (db) => {
    log.info('Creating administrativeregionlevel table');
    db.prepare(
        'CREATE TABLE administrativeregionlevel (\
        id INTEGER NOT NULL PRIMARY KEY,\
        title TEXT NOT NULL\
    );',
    ).run();

    log.info('Creating administrativeregion table');
    db.prepare(
        'CREATE TABLE administrativeregion (\
        id INTEGER NOT NULL PRIMARY KEY,\
        title TEXT NOT NULL,\
        parent_administrative_region INTEGER,\
        administrative_region_level INTEGER NOT NULL\
    );',
    ).run();
};

const initialiseUserTable = (db) => {
    log.info('Creating user table');
    db.prepare(
        'CREATE TABLE users (\
        username TEXT PRIMARY KEY,\
        password TEXT NOT NULL,\
        name TEXT,\
        upazila INTEGER,\
        token Text NOT NULL,\
        last_login DATETIME DEFAULT CURRENT_TIMESTAMP \
    );',
    ).run();
};

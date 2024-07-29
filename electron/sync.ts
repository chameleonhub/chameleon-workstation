import { app } from 'electron';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { DOMParser } from 'xmldom';
import xpath from 'xpath';
import { log } from './log';
import { auth } from '../conf/axios.ts';
import { mainWindow } from './main.ts';
import Xml2Js from 'xml2js';

const parser = new Xml2Js.Parser();

export const APP_VERSION = app.getVersion();
export const BAHIS_SERVER_URL = import.meta.env.VITE_BAHIS_SERVER_URL || 'http://localhost:3001';
const BAHIS_KOBOTOOLBOX_KF_API_URL = import.meta.env.VITE_BAHIS_KOBOTOOLBOX_KF_API_URL || 'http://kf.localhost:80/api/v2/';
const BAHIS_KOBOTOOLBOX_KC_API_URL = import.meta.env.VITE_BAHIS_KOBOTOOLBOX_KC_API_URL || 'http://kc.localhost:80/api/v1/';
log.info(`BAHIS_SERVER_URL=${BAHIS_SERVER_URL} (BAHIS 3)`);

interface xForm {
    formID: string;
    name: string;
    descriptionText: string;
    downloadUrl: string;
}

interface Form {
    uid: string;
    name: string;
    description: string;
    xml_url: string;
}

interface FormListObj {
    xforms: { xform: xForm[] };
}

const _url = (url, time?) => {
    let conjunction = '?';
    if (url.includes('?')) {
        conjunction = '&';
    }

    if (time !== null && time !== undefined) {
        return `${url}${conjunction}last_modified=${time}&bahis_desk_version=${APP_VERSION}`;
    } else {
        return `${url}${conjunction}bahis_desk_version=${APP_VERSION}`;
    }
};

function _simplifyFormObj(formObj) {
    for (const prop in formObj) {
        if (
            Object.prototype.hasOwnProperty.call(formObj, prop) &&
            Object.prototype.toString.call(formObj[prop]) === '[object Array]'
        ) {
            formObj[prop] = formObj[prop][0].toString();
        }
    }

    return formObj;
}

function _xmlToJson(xml) {
    return new Promise((resolve, reject) => {
        parser.parseString(xml, (error, data) => {
            if (error) {
                log.info('error parsing xml and converting to JSON');
                reject(error);
            } else {
                resolve(data);
            }
        });
    });
}

export const getModules = async (db) => {
    log.info(`GET Module Definitions`);

    const BAHIS_MODULE_DEFINITION_ENDPOINT = `${BAHIS_SERVER_URL}/api/desk/modules`;
    const api_url = _url(BAHIS_MODULE_DEFINITION_ENDPOINT);
    log.info(`API URL: ${api_url}`);

    auth.get(api_url)
        .then((response) => {
            if (response.data) {
                log.info('Modules received from server');

                const upsertQuery = db.prepare(
                    'INSERT INTO module (id, title, icon, description, form, external_url, sort_order, parent_module, module_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, icon = excluded.icon, description = excluded.description, form = excluded.form, external_url = excluded.external_url, sort_order = excluded.sort_order, parent_module = excluded.parent_module, module_type = excluded.module_type;',
                );
                const deleteQuery = db.prepare('DELETE FROM module WHERE id = ?');

                for (const module of response.data) {
                    if (module.is_active) {
                        upsertQuery.run([
                            module.id,
                            module.title,
                            module.icon,
                            module.description,
                            module.form,
                            module.external_url,
                            module.sort_order,
                            module.parent_module,
                            module.module_type,
                        ]);
                    } else {
                        log.info(`Deleting module ${module.id} from local database as no longer active`);
                        deleteQuery.run([module.id]);
                    }
                }
            }
            log.info('GET Module Definitions SUCCESS');
        })
        .catch((error) => {
            log.error('GET Module Definitions FAILED with:');
            log.error(error);
        });
};

export const getWorkflows = async (db) => {
    log.info(`GET Workflow Definitions`);

    const BAHIS_WORKFLOW_DEFINITION_ENDPOINT = `${BAHIS_SERVER_URL}/api/desk/workflows`;
    const api_url = _url(BAHIS_WORKFLOW_DEFINITION_ENDPOINT);
    log.info(`API URL: ${api_url}`);

    auth.get(api_url)
        .then((response) => {
            if (response.data) {
                log.info('Workflows received from server');

                const upsertQuery = db.prepare(
                    'INSERT INTO workflow (id, title, source_form, destination_form, definition) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, definition = excluded.definition;',
                );
                const deleteQuery = db.prepare('DELETE FROM workflow WHERE id = ?');

                for (const workflow of response.data) {
                    if (workflow.is_active) {
                        upsertQuery.run([
                            workflow.id,
                            workflow.title,
                            workflow.source_form,
                            workflow.destination_form,
                            JSON.stringify(workflow.definition),
                        ]);
                    } else {
                        log.warn(`Deleting workflow ${workflow.id} from local database as no longer active`);
                        deleteQuery.run([workflow.id]);
                    }
                }
            }
            log.info('GET Workflow Definitions SUCCESS');
        })
        .catch((error) => {
            log.error('GET Workflow Definitions FAILED with:');
            log.error(error);
        });
};

export const getForms = async (db) => {
    log.info(`GET KoboToolbox Form Definitions`);

    log.info(`KOBOTOOLBOX KF API URL: ${BAHIS_KOBOTOOLBOX_KF_API_URL}`);

    const kcUrl = new URL(BAHIS_KOBOTOOLBOX_KC_API_URL);
    const formListUrl = kcUrl.origin + '/formList';
    log.info('GET Form UIDs from KoboToolbox');
    console.log('### form list url ####', formListUrl);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const formList: Form[] = await auth
        // .get(BAHIS_KOBOTOOLBOX_KF_API_URL + 'assets')
        // .get(BAHIS_KOBOTOOLBOX_KC_API_URL + 'forms')
        .get(formListUrl)
        .then((response) => {
            return new Promise((resolve, reject) => {
                // first convert to JSON to make it easier to work with
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                _xmlToJson(response.data).then((formListObj: FormListObj) => {
                        if (formListObj.xforms && formListObj.xforms.xform) {
                            const forms = formListObj.xforms.xform.map((form) => {
                                // Convert arrays property values to strings, knowing that each xml node only
                                form = _simplifyFormObj(form);

                                return {
                                    uid: form.formID,
                                    name: form.name,
                                    description: form.descriptionText,
                                    xml_url: form.downloadUrl,
                                };
                            });
                            log.info(`GET Form UIDs SUCCESS`);
                            resolve(forms);
                        } else {
                            reject('Form not found');
                        }
                    })
                    .catch(reject);
            });
        })
        .then((forms) => {
            console.log(forms);
            return forms;
        })
        .catch((error) => {
            log.error('GET KoboToolbox Form Definitions FAILED with:');
            log.error(error);
            console.error(error);
        });

    const upsertQuery = db.prepare(
        'INSERT INTO form (uid, name, description, xml) VALUES (?, ?, ?, ?) ON CONFLICT(uid) DO UPDATE SET xml = excluded.xml;',
    );
    mainWindow?.webContents.send('log', formList);

    for (const form of formList) {
        log.info(`GET form ${form.uid} from KoboToolbox`);
        log.debug(form.xml_url);
        auth.get(form.xml_url)
            .then((response) => {
                const deployment = response.data;
                upsertQuery.run([form.uid, form.name, form.description, deployment]);
                log.info(`GET form ${form.uid} SUCCESS`);
            })
            .catch((error) => {
                log.error('GET KoboToolbox Form Definitions FAILED with:');
                log.error(error);
            });
    }
    log.info(`GET KoboToolbox Form Definitions SUCCESS`);
};

export const getFormCloudSubmissions = async (db) => {
    log.info(`GET KoboToolbox Form Submissions`);

    log.info(`KOBOTOOLBOX KF API URL: ${BAHIS_KOBOTOOLBOX_KF_API_URL}`);

    log.info('Using Form UIDs from local database');
    const formList = db.prepare('SELECT uid FROM form').all();

    const upsertQuery = db.prepare(
        'INSERT INTO formcloudsubmission (uuid, form_uid, xml) VALUES (?, ?, ?) ON CONFLICT(uuid) DO UPDATE SET xml = excluded.xml;',
    );
    // NOTE UUID on KoboToolbox actually might not be unique historically; but should be as of 2023

    for (const form of formList) {
        log.info(`GET form ${form.uid} submissions from KoboToolbox`);
        await auth
            .get(BAHIS_KOBOTOOLBOX_KF_API_URL + 'assets/' + form.uid + '/data/?format=xml')
            // FIXME add something like ?query={"_submission_time": {"$gt": "2019-09-01T01:02:03"}}' based on last sync time
            .then((response) => {
                const doc = new DOMParser().parseFromString(response.data, 'text/xml');

                const results = xpath.select('/root/results', doc, true) as Node;

                if (results) {
                    log.debug('Got results from server');
                    const children = results.childNodes;
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i];
                        if (child.nodeType === 1) {
                            log.debug('Handling child with nodeName: ' + child.nodeName);
                            const meta = xpath.select('meta', child, true) as Node;
                            if (meta) {
                                const meta_children = meta.childNodes;
                                for (let j = 0; j < meta_children.length; j++) {
                                    const meta_child = meta_children[j];
                                    if (meta_child.nodeType === 1 && meta_child.nodeName === 'instanceID') {
                                        const uuid = meta_child.textContent;
                                        const form_id = child.nodeName;
                                        const xml = child.toString();
                                        log.debug('Upserting form submission with UUID: ' + uuid);
                                        upsertQuery.run([uuid, form_id, xml]);
                                    }
                                }
                            }
                        }
                    }
                    log.info(`GET form ${form.uid} submissions SUCCESS`);
                } else {
                    log.warn('No results received from server');
                }
            })
            .catch((error) => {
                log.error('GET KoboToolbox Form Submissions FAILED with:');
                log.error(error);
            });
    }
    log.info(`GET KoboToolbox Form Submissions SUCCESS`);
};

export const postFormCloudSubmissions = async (db) => {
    log.info(`POST KoboToolbox Form Submissions`);

    log.info(`KOBOTOOLBOX KC API URL: ${BAHIS_KOBOTOOLBOX_KC_API_URL}`);
    const axios_config = {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    };

    log.info('Using Form Submitted to local database');
    const formcloudsubmissionList = db.prepare('SELECT * FROM formlocaldraft').all();

    const deleteQuery = db.prepare('DELETE FROM formlocaldraft WHERE uuid = ?');

    for (const form of formcloudsubmissionList) {
        log.info(`POST form ${form.uuid} submissions from KoboToolbox`);
        const selectedFile = new Blob([form.xml], { type: 'text/xml' });
        const formData = new FormData();
        formData.append('xml_submission_file', selectedFile, '@/submission.xml');

        await auth
            .post(BAHIS_KOBOTOOLBOX_KC_API_URL + 'submissions', formData, axios_config)
            .then((response) => {
                // check response is in the 201 (created) or 202 (accepted)
                // the latter seems to mean "the server already has this record"
                if (response.status === 201 || response.status === 202) {
                    deleteQuery.run([form.uuid]);
                    log.info(`POST form ${form.uid} submissions SUCCESS`);
                } else {
                    log.error(`POST form ${form.uid} submissions FAILED with status ${response.status}`);
                    log.error(response);
                }
            })
            .catch((error) => {
                log.error('POST KoboToolbox Form Submissions FAILED with:');
                log.error(error);
            });
    }
    log.info(`POST KoboToolbox Form Submissions SUCCESS`);
};

export const getTaxonomies = async (db) => {
    log.info(`GET Taxonomy Definitions`);

    const BAHIS_TAXONOMY_DEFINITION_ENDPOINT = `${BAHIS_SERVER_URL}/api/taxonomy/taxonomies`;
    const api_url = _url(BAHIS_TAXONOMY_DEFINITION_ENDPOINT);
    log.info(`API URL: ${api_url}`);

    log.info('GET Taxonomy List from server');
    const taxonomyList = await auth
        .get(api_url)
        .then((response) => {
            log.info('GET Taxonomy List SUCCESS');
            return response.data;
        })
        .catch((error) => {
            log.error('GET Taxonomy List FAILED with:');
            log.error(error);
        });

    const upsertQuery = db.prepare(
        'INSERT INTO taxonomy (slug, csv_file) VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET csv_file = excluded.csv_file;',
    );
    const BAHIS_TAXONOMY_CSV_ENDPOINT = (filename) => `${BAHIS_SERVER_URL}/media/${filename}`;

    for (const taxonomy of taxonomyList) {
        log.info(`GET Taxonomy CSV ${taxonomy.slug} from server`);
        auth.get(BAHIS_TAXONOMY_CSV_ENDPOINT(taxonomy.csv_file_stub))
            .then((response) => {
                const uPath = app.getPath('userData');

                try {
                    if (!existsSync(`${uPath}/taxonomies/`)) {
                        log.info('Creating taxonomies directory');
                        mkdirSync(`${uPath}/taxonomies/`);
                    }
                    if (existsSync(`${uPath}/${taxonomy.csv_file_stub}`)) {
                        log.info('Deleting old taxonomy');
                        rmSync(`${uPath}/${taxonomy.csv_file_stub}`);
                    }
                    writeFileSync(`${uPath}/${taxonomy.csv_file_stub}`, response.data, 'utf-8');
                } catch (error) {
                    log.error('GET Taxonomy CSV FAILED while saving with:');
                    log.error(error);
                }
                upsertQuery.run([taxonomy.slug, taxonomy.csv_file_stub]);
                log.info(`GET Taxonomy CSV ${taxonomy.slug} SUCCESS`);
            })
            .catch((error) => {
                log.error('GET Taxonomy CSV FAILED with:');
                log.error(error);
            });
    }
};

export const getAdministrativeRegions = async (db) => {
    log.info(`GET getAdministrativeRegionLevels Definitions`);

    const BAHIS_ADMINISTRATIVE_REGION_LEVELS_ENDPOINT = `${BAHIS_SERVER_URL}/api/taxonomy/administrative-region-levels`;
    const api_levels_url = _url(BAHIS_ADMINISTRATIVE_REGION_LEVELS_ENDPOINT);
    log.info(`API URL: ${api_levels_url}`);

    auth.get(api_levels_url)
        .then((response) => {
            if (response.data) {
                log.info('Administrative Region Levels received from server');

                const upsertQuery = db.prepare(
                    'INSERT INTO administrativeregionlevel (id, title) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title;',
                );

                for (const administrativeregionlevel of response.data) {
                    upsertQuery.run([administrativeregionlevel.id, administrativeregionlevel.title]);
                }
            }
            log.info('GET getAdministrativeRegionLevels Definitions SUCCESS');
        })
        .catch((error) => {
            log.error('GET getAdministrativeRegionLevels Definitions FAILED with:');
            log.error(error);
        });

    log.info(`GET getAdministrativeRegions Definitions`);

    const userAdministrativeRegionQuery = `SELECT upazila FROM users`;
    const administrativeRegionID = db.prepare(userAdministrativeRegionQuery).get().upazila; // FIXME replace when moving to BAHIS 3 user systems

    const BAHIS_ADMINISTRATIVE_REGIONS_ENDPOINT = (administrativeRegionID) =>
        `${BAHIS_SERVER_URL}/api/taxonomy/administrative-regions-catchment/?id=${administrativeRegionID}`;
    const api_url = _url(BAHIS_ADMINISTRATIVE_REGIONS_ENDPOINT(administrativeRegionID));
    log.info(`API URL: ${api_url}`);

    auth.get(api_url)
        .then((response) => {
            if (response.data) {
                log.info('Administrative Regions received from server');

                const upsertQuery = db.prepare(
                    'INSERT INTO administrativeregion (id, title, parent_administrative_region, administrative_region_level) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, parent_administrative_region = excluded.parent_administrative_region, administrative_region_level = excluded.administrative_region_level;',
                );

                for (const administrativeregion of response.data) {
                    upsertQuery.run([
                        administrativeregion.id,
                        administrativeregion.title,
                        administrativeregion.parent_administrative_region,
                        administrativeregion.administrative_region_level,
                    ]);
                }
            }
            log.info('GET getAdministrativeRegions Definitions SUCCESS');
        })
        .catch((error) => {
            log.error('GET getAdministrativeRegions Definitions FAILED with:');
            log.error(error);
        });
};

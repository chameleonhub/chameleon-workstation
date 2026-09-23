import { ipcRenderer } from 'electron';
import { log } from './log';

export interface Workflow {
    title: string;
    source_form: string;
    destination_form: string;
    definition: string;
}

export const readFormDefinition = async (form_uid: string) => {
    log.info(`reading XML definition from form for form: ${form_uid}`);
    const query = `SELECT xml
                   FROM form
                   WHERE uid IS '${form_uid}'`;
    const parser = new DOMParser();
    return ipcRenderer
        .invoke('get-local-db', query)
        .then((response) => {
            return parser.parseFromString(response[0]?.xml, 'application/xml');
        })
        .catch((error) => {
            log.error(`Error reading form definition: ${error}`);
            return undefined;
        });
};

export const readFormData = async (form_uid: string, instance_id?: string) => {
    log.info(`reading data from formcloudsubmission table for form_uid: ${form_uid}`);
    if (instance_id) log.info(`  for instance_id: ${instance_id}...`);
    let query = `SELECT *
                 FROM formcloudsubmission
                 WHERE form_uid IS '${form_uid}'`;
    if (instance_id) query += ` AND uuid IS '${instance_id}'`;
    return ipcRenderer
        .invoke('get-local-db', query)
        .then((response) => {
            log.info(`Succesfully read ${response.length} records`);
            return response;
        })
        .catch((error) => {
            log.error(`Error reading form data from DB: ${error}`);
            return undefined;
        });
};

export const readFormWorkflows = async (form_uid: string) => {
    log.info(`reading workflows from workflow table for form_uid: ${form_uid}`);
    const query = `SELECT *
                   FROM workflow
                   WHERE source_form IS '${form_uid}'`;
    return ipcRenderer
        .invoke('get-local-db', query)
        .then((response) => {
            log.info(`Succesfully read ${response.length} workflows for this form`);
            return response as Workflow[];
        })
        .catch((error) => {
            log.error(`Error reading form workflows: ${error}`);
            return [];
        });
};

const FIELDS_TO_HIDE = ['division', 'district', 'upazila']; // FIXME move out to some sort of config

export const parseSubmissionsAsRows = (submission) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(submission.xml, 'application/xml');

    const form = xmlDoc.documentElement.children;

    const recurseXML = (collection: HTMLCollection, fields: Element[]) => {
        for (const element of collection) {
            if (element.childElementCount > 0) {
                recurseXML(element.children, fields);
            } else {
                fields.push(element);
            }
        }
    };

    // Get list of all fields in the form (recursing through groups and repeats)
    const fields: Element[] = [];
    recurseXML(form, fields);

    // Map fields to a row object
    const row = {};
    fields
        .filter((element) => {
            const name = element.nodeName || '';
            return !FIELDS_TO_HIDE.includes(name);
        })
        .map((element) => {
            const parent_name = element.parentElement?.nodeName || '';
            const name = element.nodeName || '';
            const field_name = `${parent_name}_${name}`;
            const value = element.textContent || '';
            if (name.toLowerCase().includes('date')) {
                try {
                    row[field_name] = new Date(value);
                } catch (error) {
                    log.error('Error parsing date:');
                    log.error(error);
                }
                row[field_name] = new Date(value);
            } else {
                row[field_name] = value;
            }
        });

    row['id'] = submission.uuid;
    const subDate = xmlDoc.documentElement.getElementsByTagName('start');
    if (!subDate || subDate.length <= 0) {
        row['submission_date'] = new Date('2020-01-28T20:05:00');
    } else {
        row['submission_date'] = new Date(xmlDoc.documentElement.getElementsByTagName('start')[0].textContent as string);
    }
    row['raw_xml'] = submission.xml;
    return row;
};

/**
 * Recurses through an XForm <body> element collection (as parsed from xmlDoc.body.children),
 * descending into group/repeat wrappers, and collects the leaf input/select1/select field
 * elements. Shared by List (columns) and Dashboard (widgets) so both derive fields the same way.
 */
export const recurseFormBodyFields = (collection: HTMLCollection, fields: Element[] = []): Element[] => {
    for (const element of collection) {
        if (element.nodeName === 'group' || element.nodeName === 'repeat') {
            recurseFormBodyFields(element.children, fields);
        } else if (element.nodeName === 'input' || element.nodeName === 'select1' || element.nodeName === 'select') {
            fields.push(element);
        }
    }
    return fields;
};

/**
 * Reads <bind nodeset="..." type="..."/> entries from an XForm's <model>, keyed by nodeset
 * path (matching a body field's `ref` attribute), so callers can look up a field's real data
 * type (int/decimal/date/datetime/select1/select/string/geopoint/...) rather than guessing
 * from its name.
 */
export const getBindTypeMap = (xmlDoc: Document): Map<string, string> => {
    const bindTypeMap = new Map<string, string>();
    const binds = xmlDoc.getElementsByTagName('bind');
    for (const bind of binds) {
        const nodeset = bind.getAttribute('nodeset');
        const type = bind.getAttribute('type');
        if (nodeset && type) {
            bindTypeMap.set(nodeset, type.toLowerCase());
        }
    }
    return bindTypeMap;
};

export const fieldRef = (element: Element): string => element.getAttribute('ref') || '';

export const fieldNameParts = (element: Element): { parent_name: string; name: string } => {
    const refSegments = fieldRef(element).split('/');
    return {
        parent_name: refSegments[refSegments.length - 2] || '',
        name: refSegments[refSegments.length - 1] || '',
    };
};

export const titleCase = (s: string) =>
    s.replace(/^_*(.)|_+(.)/g, (_s, c, d) => (c ? c.toUpperCase() : ' ' + d.toUpperCase()));

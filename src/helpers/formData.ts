import { ipc } from './ipc';
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
    return ipc
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
    return ipc
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
    return ipc
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

    // Map fields to a row object. Callers that want to hide specific fields (e.g. List's
    // geo-location columns, which are hidden by default but stay toggleable) do so on their own
    // view of this data (column visibility model, widget selection, etc.), not by dropping the
    // value here - Dashboard's geo widgets, for one, need these values present.
    const row = {};
    fields.map((element) => {
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

export type ChoiceLabelMaps = Record<string, Map<string, string>>;

const parseItemsAsLabelMap = (root: Element): Map<string, string> => {
    const map = new Map<string, string>();
    const items = root.getElementsByTagName('item');
    for (const item of items) {
        const name = item.getElementsByTagName('name')[0]?.textContent?.trim();
        const label = item.getElementsByTagName('label')[0]?.textContent?.trim();
        if (name && label) map.set(name, label);
    }
    return map;
};

// A select/select1 with no <itemset> at all (no secondary-instance indirection) instead has its
// choices as direct <item><label>.../<label><value>.../<value></item> children right in the body -
// note <value>, not <name>, unlike the secondary-instance <item> shape parseItemsAsLabelMap reads.
const parseInlineBodyItems = (element: Element): Map<string, string> => {
    const map = new Map<string, string>();
    for (const child of element.children) {
        if (child.nodeName !== 'item') continue;
        const value = child.getElementsByTagName('value')[0]?.textContent?.trim();
        const label = child.getElementsByTagName('label')[0]?.textContent?.trim();
        if (value && label) map.set(value, label);
    }
    return map;
};

/**
 * Builds a code -> label lookup per select/select1 field, so a submitted choice value like "3"
 * can be shown as "Anthrax" instead of its raw stored code. Covers every itemset convention this
 * app's forms use - the same three Form.tsx already resolves for the live, editable form, plus
 * one more that needs no itemset at all:
 *  - no `<itemset>` - choices are `<item><value>/<value><label>...</label></item>` right on the
 *    select/select1 itself, resolved synchronously with no IPC call
 *  - `instance('deskTaxonomy.<slug>')` -> the `taxonomy` table's synced CSV, via read-taxonomy-data
 *    (or read-administrative-region-data for the administrative_region special case)
 *  - `instance('id')` where that `<instance id="id" src="jr://file-csv/<file>">` -> this form's
 *    own synced media CSV (formmedia table), via read-form-media-data
 *  - anything else -> `<item><name>/<name><label>...</label></item>` choices already embedded
 *    directly in this form's own `<model><instance>`, resolved synchronously with no IPC call
 * This is read-only (just the label lookup) - unlike Form.tsx it never splices data back into the
 * form XML, since List/Dashboard only display already-submitted values, they don't render a form.
 */
export const buildChoiceLabelMaps = async (
    xmlDoc: Document,
    form_uid: string,
    fields: Element[],
): Promise<ChoiceLabelMaps> => {
    const maps: ChoiceLabelMaps = {};
    const taxonomyCache = new Map<string, Promise<Map<string, string>>>();
    const mediaCache = new Map<string, Promise<Map<string, string>>>();

    const fetchTaxonomy = (slug: string): Promise<Map<string, string>> => {
        if (!taxonomyCache.has(slug)) {
            const invocation =
                slug === 'administrative_region'
                    ? ipc.invoke('read-administrative-region-data')
                    : ipc.invoke('read-taxonomy-data', slug);
            taxonomyCache.set(
                slug,
                invocation
                    .then((xmlString: string) =>
                        parseItemsAsLabelMap(new DOMParser().parseFromString(xmlString, 'application/xml').documentElement),
                    )
                    .catch((error: unknown) => {
                        log.error(`Error reading taxonomy data for ${slug}: ${error}`);
                        return new Map<string, string>();
                    }),
            );
        }
        return taxonomyCache.get(slug) as Promise<Map<string, string>>;
    };

    const fetchFormMedia = (filename: string): Promise<Map<string, string>> => {
        if (!mediaCache.has(filename)) {
            mediaCache.set(
                filename,
                ipc
                    .invoke('read-form-media-data', form_uid, filename)
                    .then((xmlString: string) =>
                        parseItemsAsLabelMap(new DOMParser().parseFromString(xmlString, 'application/xml').documentElement),
                    )
                    .catch((error: unknown) => {
                        log.error(`Error reading form media data for ${filename}: ${error}`);
                        return new Map<string, string>();
                    }),
            );
        }
        return mediaCache.get(filename) as Promise<Map<string, string>>;
    };

    await Promise.all(
        fields.map(async (element) => {
            if (element.nodeName !== 'select1' && element.nodeName !== 'select') return;
            const { parent_name, name } = fieldNameParts(element);
            const fieldKey = `${parent_name}_${name}`;

            const itemset = element.getElementsByTagName('itemset')[0];
            const nodeset = itemset?.getAttribute('nodeset') || '';
            const instanceId = nodeset.match(/instance\('([^']+)'\)/)?.[1];

            if (!instanceId) {
                const inlineMap = parseInlineBodyItems(element);
                if (inlineMap.size > 0) maps[fieldKey] = inlineMap;
                return;
            }

            if (instanceId.startsWith('deskTaxonomy.')) {
                const slug = instanceId.slice('deskTaxonomy.'.length);
                maps[fieldKey] = await fetchTaxonomy(slug);
                return;
            }

            const instances = xmlDoc.getElementsByTagName('instance');
            for (const inst of instances) {
                if (inst.getAttribute('id') !== instanceId) continue;
                const src = inst.getAttribute('src');
                if (src?.startsWith('jr://file-csv/')) {
                    maps[fieldKey] = await fetchFormMedia(src.slice('jr://file-csv/'.length));
                } else {
                    maps[fieldKey] = parseItemsAsLabelMap(inst);
                }
                break;
            }
        }),
    );

    return maps;
};

const resolveChoiceLabel = (rawValue: string, labelMap: Map<string, string>): string =>
    rawValue
        .split(/\s+/)
        .filter(Boolean)
        .map((code) => labelMap.get(code) ?? code)
        .join(', ');

/** Applies buildChoiceLabelMaps' lookups to a row parsed by parseSubmissionsAsRows. */
export const applyChoiceLabels = <T extends Record<string, unknown>>(row: T, maps: ChoiceLabelMaps): T => {
    const resolved = { ...row };
    for (const fieldKey of Object.keys(maps)) {
        const value = resolved[fieldKey];
        if (typeof value === 'string' && value) {
            (resolved as Record<string, unknown>)[fieldKey] = resolveChoiceLabel(value, maps[fieldKey]);
        }
    }
    return resolved;
};

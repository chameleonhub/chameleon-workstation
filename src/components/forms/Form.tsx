import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { log } from '../../helpers/log';
import { ipc } from '../../helpers/ipc';
import { EnketoForm } from './EnketoForm';
import { Footer } from './EnketoFooter';
import { LoadingSpinner } from '../common/LoadingSpinner.tsx';
import { VetBackground } from '../common/VetBackground';

const readFormData = async (tableName: string, form_uid: string, instance_id?: string) => {
    log.info(`reading data from ${tableName} table...`);
    log.info(`  for form_uid: ${form_uid}...`);
    if (instance_id) log.info(`  for instance_id: ${instance_id}...`);
    let query = `SELECT *
                 FROM ${tableName}
                 WHERE form_uid IS '${form_uid}'`;
    if (instance_id) query += ` AND uuid IS '${instance_id}'`;
    return ipc
        .invoke('get-local-db', query)
        .then((response) => {
            log.info(`  read ${response.length} records`);
            return response;
        })
        .catch((error) => {
            log.error(`Error reading form data: ${error}`);
            return [];
        });
};

interface FormProps {
    draft?: boolean;
}

export const Form: React.FC<FormProps> = ({ draft = false }: FormProps) => {
    const [formXML, setFormXML] = useState<string>('');
    const [injectedData, setInjectedData] = useState<string>();
    const [prefilledFormXML, setPrefilledFormXML] = useState<string>('');
    const [tableName, setTableName] = useState<string>('');
    const [editable, setEditable] = useState<boolean>(true);
    const [isDeskUserReplaced, setIsDeskUserReplaced] = useState<boolean>(false);
    const [isDeskTaxonomyInserted, setIsDeskTaxonomyInserted] = useState<boolean>(false);
    const [isPrefilled, setIsPrefilled] = useState<boolean>(false);

    const { state } = useLocation();

    const { form_uid, instance_id } = useParams();

    // catch changing location state for injected data via workflow
    useEffect(() => {
        if (state?.injectedData) {
            log.info('Injecting data via workflow');
            setInjectedData(state.injectedData);
        }
    }, [state]);

    // decide which data table to read from, e.g. submitted or cloud
    useEffect(() => {
        log.info('Deciding which data table to read from');
        if (draft) {
            setTableName('formlocaldraft');
        } else {
            setTableName('formcloudsubmission');
        }
    }, [draft]);

    // if the form has been filled out previously, do we want to allow editing?
    useEffect(() => {
        if (!draft && instance_id) {
            log.info('This is a cloud form, blocking editing.');
            setEditable(false);
        }
    }, [draft, instance_id]);

    // read form defintion
    useEffect(() => {
        const readForm = (form_uid: string) => {
            log.info(`reading XML definition from forms for form: ${form_uid}`);
            const query = `SELECT xml
                           FROM form
                           WHERE uid = '${form_uid}'`;
            ipc.invoke('get-local-db', query)
                .then((response) => {
                    if (response[0]?.xml) {
                        setFormXML(response[0]?.xml);
                        log.info('Form XML definition read successfully');
                    }
                })
                .catch((error) => {
                    log.error('Error reading form XML definition');
                    log.error(error);
                });
        };

        if (form_uid) {
            readForm(form_uid);
        }
    }, [form_uid]);

    // replace deskUser and deskChoice tags in form definition
    useEffect(() => {
        log.info('Form definition changed');

        // Guards the async work below against a superseded run of this same effect - React 18
        // StrictMode double-invokes effects in dev (mount, cleanup, mount again), and a real
        // double-render can happen in production too (e.g. quickly opening a second report before
        // the first one's taxonomy lookups finish). Without this, two overlapping calls each parse
        // their own copy of the same starting formXML and each call setFormXML with their own
        // result when they finish - whichever finishes last wins and silently discards the other's
        // replacements (this is how a form's medicinesv2 pulldata instance could end up unresolved
        // - Enketo logs "Can't find medicinesv2.csv." - even though the read itself succeeded).
        let cancelled = false;

        const replaceUserValues = (formXML: string) => {
            log.info('Replacing deskUser tags in form definition');
            const parser = new DOMParser();
            const serializer = new XMLSerializer();

            const doc = parser.parseFromString(formXML, 'application/xml');

            const elements = doc.getElementsByTagName('*');

            let hasReplacements = false;
            ipc.invoke('read-user-administrative-region', 'asName')
                .then((response) => {
                    log.info(`Administrative region: ${JSON.stringify(response)}`);
                    for (let i = 0; i < elements.length; i++) {
                        if (elements[i].textContent?.startsWith('deskUser')) {
                            switch (elements[i].textContent) {
                                case 'deskUser.administrative_region_1':
                                    log.debug(elements[i].textContent);
                                    log.debug(response['1']);
                                    elements[i].textContent = response['1'];
                                    hasReplacements = true;
                                    break;
                                case 'deskUser.administrative_region_2':
                                    elements[i].textContent = response['2'];
                                    hasReplacements = true;
                                    break;
                                case 'deskUser.administrative_region_3':
                                    elements[i].textContent = response['3'];
                                    hasReplacements = true;
                                    break;
                                default:
                                    break;
                            }
                        }
                    }
                })
                .finally(() => {
                    if (cancelled) return;
                    if (hasReplacements) {
                        setFormXML(serializer.serializeToString(doc));
                        log.info('deskUser tags replaced successfully');
                    } else {
                        log.info('No deskUser tags found');
                        setIsDeskUserReplaced(true);
                        return;
                    }
                })
                .catch((error) => {
                    log.error(`Error getting administrative region: ${error}`);
                });
        };

        const readTaxonomyChoices = (taxonomySlug: string) => {
            log.info(`Reading taxonomy data for ${taxonomySlug}`);
            const parser = new DOMParser();

            if (taxonomySlug === 'administrative_region') {
                return ipc
                    .invoke('read-administrative-region-data')
                    .then((data: string) => {
                        return parser.parseFromString(data, 'application/xml');
                    })
                    .catch((error) => {
                        log.error('Error reading administrative region data data');
                        log.error(error);
                        return null;
                    });
            } else {
                return ipc
                    .invoke('read-taxonomy-data', taxonomySlug)
                    .then((data: string) => {
                        return parser.parseFromString(data, 'application/xml');
                    })
                    .catch((error) => {
                        log.error('Error reading taxonomy data');
                        log.error(error);
                        return null;
                    });
            }
        };

        // Kobo's native external-CSV mechanism for pulldata(): <instance id="X" src="jr://file-csv/X.csv"/>,
        // distinct from the deskTaxonomy.* instances above.
        const readFormMediaChoices = (filename: string) => {
            log.info(`Reading form media data for ${filename}`);
            const parser = new DOMParser();

            return ipc
                .invoke('read-form-media-data', form_uid, filename)
                .then((data: string) => {
                    return parser.parseFromString(data, 'application/xml');
                })
                .catch((error) => {
                    log.error(`Error reading form media data for ${filename}`);
                    log.error(error);
                    return null;
                });
        };

        const insertTaxonomyChoices = async (formXML: string) => {
            log.info('Inserting deskTaxonomy choices in form definition');
            const parser = new DOMParser();
            const serializer = new XMLSerializer();

            const doc = parser.parseFromString(formXML, 'application/xml');
            const elements = doc.getElementsByTagName('*');

            let hasReplacements = false;
            for (let i = 0; i < elements.length; i++) {
                if (elements[i].tagName === 'instance' && elements[i].getAttribute('id')?.startsWith('deskTaxonomy')) {
                    log.info(`Found deskTaxonomy tag ${elements[i].getAttribute('id')}`);
                    let choiceOptions: Document | null = null;
                    let taxonomySlug;

                    if (elements[i].getAttribute('id') === 'deskTaxonomy.administrative_region') {
                        taxonomySlug = 'administrative_region';
                    } else {
                        taxonomySlug = elements[i].getAttribute('id')?.slice('deskTaxonomy.'.length);
                    }

                    if (taxonomySlug) {
                        choiceOptions = await readTaxonomyChoices(taxonomySlug);
                    }

                    if (choiceOptions) {
                        elements[i].replaceChildren(choiceOptions.documentElement);
                        elements[i].setAttribute('id', taxonomySlug);

                        for (let i = 0; i < elements.length; i++) {
                            if (
                                elements[i].tagName === 'itemset' &&
                                elements[i].getAttribute('nodeset')?.startsWith('instance')
                            ) {
                                const nodeset = elements[i].getAttribute('nodeset');
                                if (nodeset && nodeset.includes(`deskTaxonomy.${taxonomySlug}`)) {
                                    const newNodeset = nodeset?.replace('deskTaxonomy.', '');
                                    elements[i].setAttribute('nodeset', newNodeset);
                                }
                            }
                        }
                        hasReplacements = true;
                    }
                } else if (
                    elements[i].tagName === 'instance' &&
                    elements[i].getAttribute('src')?.startsWith('jr://file-csv/')
                ) {
                    const src = elements[i].getAttribute('src');
                    const filename = src?.slice('jr://file-csv/'.length);
                    log.info(`Found external CSV instance ${elements[i].getAttribute('id')} (${filename})`);

                    const choiceOptions = filename ? await readFormMediaChoices(filename) : null;

                    if (choiceOptions) {
                        elements[i].replaceChildren(choiceOptions.documentElement);
                        elements[i].removeAttribute('src');
                        hasReplacements = true;
                    }
                }
            }

            if (cancelled) return;
            if (hasReplacements) {
                setFormXML(serializer.serializeToString(doc));
                log.info('deskTaxonomy choices replaced successfully');
            } else {
                log.info('No deskTaxonomy tags found');
                setIsDeskTaxonomyInserted(true);
            }
        };

        if (formXML) {
            if (!instance_id && !injectedData) {
                log.info('This appears to be a fresh form, replacing deskUser and deskTaxonomy tags.');
                replaceUserValues(formXML);
                insertTaxonomyChoices(formXML);
            } else {
                // deskUser prefill only matters for a brand-new form, but taxonomy/media choice lists
                // are still needed here regardless of editability - a select/select1 backed by a
                // deskTaxonomy.* or file-csv instance has no <option>s to match its saved value
                // against until this runs, so it rendered "none selected" for a read-only report even
                // though the model's value was correctly loaded (see replacePrefilledValues below).
                log.info('This appears to be a filled-in form, only replacing deskTaxonomy tags.');
                setIsDeskUserReplaced(true);
                insertTaxonomyChoices(formXML);
            }
        }

        return () => {
            cancelled = true;
        };
    }, [formXML, instance_id, injectedData, form_uid]);

    // if the form has been filled out previously, read the data
    // FIXME and then force it into the form as "default" data
    // because we couldn't get the instanceStr to work in the EnketoForm component
    // but we also use this for injecting data via a workflow
    useEffect(() => {
        const replacePrefilledValues = (formXML: string, formData: string) => {
            log.info('Replacing prefilled values in form definition');
            const parser = new DOMParser();
            const serializer = new XMLSerializer();

            const doc = parser.parseFromString(formXML, 'application/xml');
            const prefilledDoc = parser.parseFromString(formData, 'application/xml');

            const elements = prefilledDoc.getElementsByTagName('*');

            let hasReplacements = false;
            for (let i = 0; i < elements.length; i++) {
                if (elements[i].children.length === 0 && elements[i].textContent) {
                    // find the corresponding element in the form definition
                    const formElement = doc.getElementsByTagName(elements[i].tagName)[0];
                    if (formElement && formElement.children.length === 0) {
                        formElement.textContent = elements[i].textContent;
                        hasReplacements = true;
                    }
                }
            }

            if (hasReplacements) {
                setPrefilledFormXML(serializer.serializeToString(doc));
                log.info('Prefilled values replaced successfully');
            } else {
                log.info('No prefilled values found');
                setIsPrefilled(true);
            }
        };

        if (form_uid && tableName && instance_id) {
            log.info(`Reading data for form: ${form_uid} (${tableName}) and instance: ${instance_id}`);
            readFormData(tableName, form_uid, instance_id)
                .then((response) => {
                    const formData = response[0]['xml'] as string;
                    replacePrefilledValues(formXML, formData);
                })
                .catch((error) => {
                    log.error('Error reading form data');
                    log.error(error);
                });
        } else if (injectedData) {
            log.info('Prefilling form with injected data (probably a workflow)');
            replacePrefilledValues(formXML, injectedData);
        } else {
            setPrefilledFormXML(formXML);
            setIsPrefilled(true);
        }
    }, [form_uid, formXML, tableName, instance_id, injectedData]);

    return (
        <>
            <VetBackground />
            {form_uid && prefilledFormXML && isDeskUserReplaced && isDeskTaxonomyInserted && isPrefilled ? (
                <EnketoForm formUID={form_uid} formODKXML={prefilledFormXML} instanceID={instance_id} editable={editable} />
            ) : (
                <LoadingSpinner loadingText="Form is Loading" />
            )}
            <Footer />
        </>
    );
};

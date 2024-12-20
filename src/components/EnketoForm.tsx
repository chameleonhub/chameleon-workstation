import { Box, Button, Stack } from '@mui/material';
import { ipcRenderer } from 'electron';
import { Form } from 'enketo-core';
import { transform } from 'enketo-transformer/web';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { log } from '../helpers/log';
import { fetchDraftCount } from '../stores/featues/draftCounterSlice.ts';
import { useAppDispatch } from '../stores/store.ts';

interface EnketoFormProps {
    formUID: string; // The unique identifier for the form
    formODKXML: string; // The XML string of the form
    instanceID?: string; // The instance ID for a previously submitted form
    editable?: boolean; // Whether the form should be editable
}

export const EnketoForm: React.FC<EnketoFormProps> = ({ formUID, formODKXML, instanceID, editable }) => {
    const formEl = useRef<HTMLDivElement>(null);
    const [form, setForm] = useState<Form | null>(null);
    const dispatch = useAppDispatch();

    const navigate = useNavigate();

    const createOrUpdateDraft = (data) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'application/xml');
        const uuid = doc.getElementsByTagName('instanceID')[0].textContent;
        const query = `INSERT INTO formlocaldraft (uuid, form_uid, xml)
                       VALUES ('${uuid}', '${formUID}', '${data}')
                       ON CONFLICT (uuid) DO UPDATE SET xml = excluded.xml;`;

        ipcRenderer
            .invoke('post-local-db', query)
            .then((response) => {
                if (response) {
                    log.info('Form draft added to local database successfully');
                }
            })
            .catch((error) => {
                log.error('Error adding form draft to local database:');
                log.error(error);
            })
            .finally(() => {
                dispatch(fetchDraftCount());
            });
    };

    const deleteDraft = (uuid) => {
        const query = `DELETE
                       FROM formlocaldraft
                       WHERE uuid = '${uuid}';`;
        ipcRenderer
            .invoke('post-local-db', query)
            .then((response) => {
                if (response) {
                    log.info('Form draft deleted from local database successfully');
                }
            })
            .catch((error) => {
                log.error('Error deleting form draft from local database:');
                log.error(error);
            })
            .finally(() => {
                dispatch(fetchDraftCount());
            });
    };

    const convertToReadOnly = (formHTML: string) => {
        log.info('Converting all fields to read-only');
        const parser = new DOMParser();
        const serializer = new XMLSerializer();

        const doc = parser.parseFromString(formHTML, 'text/html');

        // convert all elements to read-only
        const elements = doc.querySelectorAll(
            '.question input:not([readonly]), .question textarea:not([readonly]), .question select:not([readonly]), .question fieldset:not([readonly])',
        );
        for (let i = 0; i < elements.length; i++) {
            elements[i].setAttribute('readonly', 'readonly');
            elements[i].classList.add('readonly-forced');
        }

        // prevent add/remove of repeat instances
        const repeats = doc.querySelectorAll('.or-repeat-info');
        for (let i = 0; i < repeats.length; i++) {
            repeats[i].setAttribute('data-repeat-fixed', 'fixed');
        }

        const formHTMLReadyOnly = serializer.serializeToString(doc);
        log.info('All fields converted to read-only');
        return formHTMLReadyOnly;
    };

    useEffect(() => {
        if (!formODKXML) return;

        // when the component mounts, transform the form ODK XML to enketo XML and HTML
        // checking whether or not the form should be editable
        // and converting the form to read-only if necessary

        log.info('Transforming form ODK XML to enketo XML and HTML');
        transform({
            xform: formODKXML,
            media: {},
            openclinica: 0,
            markdown: true,
            theme: 'kobo',
        })
            .then((result) => {
                if (formEl.current === null) return;
                // check model
                if (!result.model || !result.form) return;

                const enketoModel = result.model;
                let enketoForm = result.form;

                if (!editable) {
                    enketoForm = convertToReadOnly(result.form);
                }

                // when the Enketo HTML is generated, inject it into the form container
                formEl.current.innerHTML = enketoForm;

                // when the Enketo XML and existing form data are generated, create the Enketo Form object
                const data = {
                    modelStr: enketoModel,
                    instanceStr: null, // FIXME - instanceStr does not work so we have hacked a solution at the parent Form component level
                    submitted: instanceID !== undefined,
                };

                const options = {}; // FIXME how to provide username?

                const frm = new Form(formEl.current?.children[0], data, options);
                setForm(frm);

                log.info('Form Created');

                // when the Enketo Form object is created, init the form
                const loadErrors = frm.init();
                loadErrors.length && console.warn(loadErrors);

                log.info('Form HTML and XML generated successfully');
            })
            .catch((error) => {
                log.error('Error transforming form ODK XML to enketo XML and HTML:');
                log.error(error);
            });
    }, [formODKXML]);

    const onSubmit = () => {
        if (form) {
            form.validate()
                .then((valid) => {
                    if (valid) {
                        log.info('Enketo form validation successful');
                        const data = form.getDataStr();
                        if (data) {
                            createOrUpdateDraft(data);
                            navigate('/list/drafts');
                        }
                    } else {
                        log.error('Enketo form validation failed');
                    }
                })
                .catch((error) => {
                    log.error('Error validating Enketo form:');
                    log.error(error);
                });
        }
    };

    const onReset = () => {
        if (form) {
            form.resetView();
        }
    };

    const onCancel = () => {
        navigate(`/list/${formUID}`);
    };

    const onDelete = () => {
        if (form && instanceID) {
            deleteDraft(instanceID);
        }
        navigate(`/list/drafts`);
    };

    return (
        <Stack className="ek-form" sx={{ margin: '2rem 3rem' }}>
            <div ref={formEl}></div>
            <Box>
                {editable && (
                    <>
                        <Button onClick={onCancel}>Cancel</Button>
                        <Button onClick={onReset}>Reset</Button>
                        <Button onClick={onSubmit}>Submit</Button>
                        {instanceID && <Button onClick={onDelete}>Delete Draft</Button>}
                    </>
                )}
            </Box>
        </Stack>
    );
};

EnketoForm.defaultProps = {
    editable: true,
};

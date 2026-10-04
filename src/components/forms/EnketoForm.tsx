import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
import { attachAutocompleteLists } from '../../helpers/autocompleteList';
import { ipc } from '../../helpers/ipc';
import { Form } from 'enketo-core';
import { transform } from 'enketo-transformer/web';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { detectFormTheme, useFormTheme } from '../../helpers/formTheme';
import { log } from '../../helpers/log';
import { escapeSqlString } from '../../helpers/sql.ts';
import { fetchDraftCount } from '../../stores/featues/draftCounterSlice.ts';
import { useAppDispatch } from '../../stores/store.ts';

interface EnketoFormProps {
    formUID: string; // The unique identifier for the form
    formODKXML: string; // The XML string of the form
    instanceID?: string; // The instance ID for a previously submitted form
    editable?: boolean; // Whether the form should be editable
}

export const EnketoForm: React.FC<EnketoFormProps> = ({ formUID, formODKXML, instanceID, editable = true }) => {
    const formEl = useRef<HTMLDivElement>(null);
    const [form, setForm] = useState<Form | null>(null);
    // Reset wipes every answer on the current form (form.resetView()) and Cancel discards it by
    // navigating away, neither previously asked for confirmation - unlike Logout/Reset-database
    // elsewhere in the app, both of which do. On forms with 20+ groups (see Patient Registry), an
    // accidental click here loses a lot of work.
    const [confirmAction, setConfirmAction] = useState<'reset' | 'cancel' | null>(null);
    // Top-level section (group) labels, for the "N of M: <label>" indicator - see the focusin
    // effect below. None of this app's forms enable Enketo's own built-in pagination (that only
    // activates when the XForm's <h:body> has a "pages" class - checked, none of the 8 real forms
    // do), so every group renders on one continuous scroll with nothing indicating progress.
    const [sectionLabels, setSectionLabels] = useState<string[]>([]);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    // A form can ask for the grid theme (XLSForm `style = theme-grid`). Only the theme of the form on screen is
    // loaded, and the form isn't rendered until its stylesheet is in the page.
    const theme = useMemo(() => detectFormTheme(formODKXML), [formODKXML]);
    const themeReady = useFormTheme(theme);
    const dispatch = useAppDispatch();

    const navigate = useNavigate();

    const createOrUpdateDraft = (data) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'application/xml');
        const uuid = doc.getElementsByTagName('instanceID')[0].textContent;
        // data is the full form XML, including every free-text answer - unescaped, a single
        // apostrophe (a name, a note) breaks the query's quoting and silently fails the save.
        const query = `INSERT INTO formlocaldraft (uuid, form_uid, xml)
                       VALUES ('${escapeSqlString(uuid ?? '')}', '${escapeSqlString(formUID)}', '${escapeSqlString(data)}')
                       ON CONFLICT (uuid) DO UPDATE SET xml = excluded.xml;`;

        ipc.invoke('post-local-db', query)
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
                       WHERE uuid = '${escapeSqlString(uuid)}';`;
        ipc.invoke('post-local-db', query)
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

        // convert all elements to read-only. Not the <fieldset>s around radio/checkbox groups: readonly isn't a valid
        // attribute on them (each option's own input is marked below), and Enketo's readonly module asks every
        // [readonly] element for its name, which a fieldset doesn't have - one "input node has no name" console
        // error per group.
        const elements = doc.querySelectorAll(
            '.question input:not([readonly]), .question textarea:not([readonly]), .question select:not([readonly])',
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
        if (!formODKXML || !themeReady) return;

        // Form.tsx feeds formODKXML in through a multi-pass convergence (deskUser/taxonomy/prefill
        // tag resolution, each pass re-triggering itself until nothing's left to replace) - it can
        // update several times in quick succession for a single form open, each still-resolving
        // intermediate value included. Without this guard, every one of those intermediate values
        // would get its own real Form object built and initialized, each logging its own (often
        // spurious - e.g. "Can't find X.csv." for an instance the *next* pass was about to resolve)
        // load errors, even though only the last, fully-resolved value ends up actually shown.
        let cancelled = false;

        // when the component mounts, transform the form ODK XML to enketo XML and HTML
        // checking whether or not the form should be editable
        // and converting the form to read-only if necessary

        // transform()'s `theme` option overwrites whatever theme class the form itself declares, so it has to be
        // given the theme detected from the form (a hard-coded 'kobo' turned every theme-grid form into a kobo one).
        log.info('Transforming form ODK XML to enketo XML and HTML');
        transform({
            xform: formODKXML,
            media: {},
            openclinica: 0,
            markdown: true,
            theme,
        })
            .then((result) => {
                if (cancelled) return;
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

                // Top-level, non-repeat groups define the form's section outline - repeats are
                // excluded since their groups repeat per instance (e.g. "Product 1".."Product 5")
                // rather than being distinct sections of the form.
                const groupEls = Array.from(formEl.current.querySelectorAll<HTMLElement>('.or-group, .or-group-data')).filter(
                    (el) => !el.parentElement?.closest('.or-group, .or-group-data') && !el.closest('.or-repeat'),
                );
                const labels = groupEls
                    .map((el) => {
                        const heading = el.querySelector<HTMLElement>(':scope > h3, :scope > h4');
                        const activeLabel = heading?.querySelector<HTMLElement>('.question-label.active');
                        return (activeLabel ?? heading)?.textContent?.trim() || '';
                    })
                    .filter((label) => label.length > 0);
                setSectionLabels(labels);

                log.info('Form HTML and XML generated successfully');
            })
            .catch((error) => {
                if (cancelled) return;
                log.error('Error transforming form ODK XML to enketo XML and HTML:');
                log.error(error);
            });

        return () => {
            cancelled = true;
        };
    }, [formODKXML, themeReady]);

    // Electron's popup for the autocomplete widget's <datalist> can't scroll - swap in our own list.
    useEffect(() => {
        if (!formEl.current) return;
        return attachAutocompleteLists(formEl.current);
    }, []);

    // Tracks which top-level section currently has focus, for the "N of M: <label>" indicator.
    // Keyed off focus rather than scroll position - it's exact (no rootMargin/threshold tuning)
    // and matches where the agent is actually interacting, not just what's scrolled into view.
    useEffect(() => {
        if (sectionLabels.length === 0 || !formEl.current) return;

        const groupEls = Array.from(formEl.current.querySelectorAll<HTMLElement>('.or-group, .or-group-data')).filter(
            (el) => !el.parentElement?.closest('.or-group, .or-group-data') && !el.closest('.or-repeat'),
        );

        const container = formEl.current;
        const handleFocusIn = (event: FocusEvent) => {
            const idx = groupEls.findIndex((group) => group.contains(event.target as Node));
            if (idx >= 0) setCurrentSectionIndex(idx);
        };

        container.addEventListener('focusin', handleFocusIn);
        return () => container.removeEventListener('focusin', handleFocusIn);
    }, [sectionLabels]);

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
        setConfirmAction('reset');
    };

    const onCancel = () => {
        setConfirmAction('cancel');
    };

    const onConfirmActionClose = () => {
        setConfirmAction(null);
    };

    const onConfirmActionProceed = () => {
        if (confirmAction === 'reset' && form) {
            form.resetView();
        } else if (confirmAction === 'cancel') {
            navigate(`/list/${formUID}`);
        }
        setConfirmAction(null);
    };

    const onDelete = () => {
        if (form && instanceID) {
            deleteDraft(instanceID);
        }
        navigate(`/list/drafts`);
    };

    return (
        <Stack className="ek-form" sx={{ margin: '2rem 3rem', backgroundColor: 'background.paper' }}>
            {editable && sectionLabels.length > 0 && (
                <Box
                    sx={{
                        position: 'sticky',
                        // Stick just below the fixed Header (top: 0 put it directly behind the
                        // header's higher z-index, since Layout's own Header spacer <Toolbar />
                        // already occupies that space) - same theme mixin Layout uses to size that
                        // spacer, so this stays in sync with the header's actual height.
                        top: (theme) => theme.mixins.toolbar.minHeight,
                        zIndex: 1,
                        backgroundColor: 'background.paper',
                        py: 1,
                        mb: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography variant="subtitle2" color="text.secondary">
                        Section {currentSectionIndex + 1} of {sectionLabels.length}: {sectionLabels[currentSectionIndex]}
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={((currentSectionIndex + 1) / sectionLabels.length) * 100}
                        sx={{ mt: 0.5, borderRadius: 1 }}
                    />
                </Box>
            )}
            <div ref={formEl}></div>
            <Box sx={{ display: 'flex', gap: '1rem' }}>
                {editable && (
                    <>
                        <Button variant="contained" color="error" size="large" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button variant="contained" color="info" size="large" onClick={onReset}>
                            Reset
                        </Button>
                        <Button variant="contained" color="success" size="large" onClick={onSubmit}>
                            Submit
                        </Button>
                        {instanceID && <Button onClick={onDelete}>Delete Draft</Button>}
                    </>
                )}
            </Box>
            <Dialog open={confirmAction !== null} onClose={onConfirmActionClose} aria-labelledby="confirm-action-title">
                <DialogTitle id="confirm-action-title">Are you sure?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {confirmAction === 'reset'
                            ? 'This will clear everything entered on this form. This cannot be undone.'
                            : 'This will discard everything entered on this form. This cannot be undone.'}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onConfirmActionProceed} color="error">
                        Yes
                    </Button>
                    <Button onClick={onConfirmActionClose} autoFocus>
                        No
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

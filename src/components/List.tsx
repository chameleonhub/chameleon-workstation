import { Tooltip, Typography } from '@mui/material';
import { DataGrid, GridActionsCellItem, GridColDef, GridColumnVisibilityModel, GridToolbar } from '@mui/x-data-grid';
import PostAddIcon from '@mui/icons-material/PostAdd';
import { useEffect, useState } from 'react';
import { log } from '../helpers/log';
import { ipcRenderer } from 'electron';
import { useNavigate, useParams } from 'react-router-dom';

// const GROUPS_TO_SHOW = ['basic_info'];
const FIELDS_TO_HIDE = ['division', 'district', 'upazila']; // FIXME move out to some sort of config}

interface Workflow {
    title: string;
    source_form: string;
    destination_form: string;
    definition: string;
}

const readFormDefinition = async (form_uid: string) => {
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

const readFormData = async (form_uid: string, instance_id?: string) => {
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

const readFormWorkflows = async (form_uid: string) => {
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

const mapWorkflow = (workflow: Workflow, row) => {
    log.info(`Mapping data of ${row.id} through ${workflow.title} workflow`);
    const mapping = JSON.parse(workflow.definition);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(row.raw_xml, 'application/xml');

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

    fields.map((element) => {
        const parent_name = element.parentElement?.nodeName || '';
        const name = element.nodeName || '';
        const field_name = `${parent_name}/${name}`; // same format as definitions
        if (mapping[field_name]) {
            // replace element with identical element with new tag name
            const newElement = xmlDoc.createElement(mapping[field_name].split('/').at(-1));
            newElement.textContent = element.textContent;
            element.replaceWith(newElement, element);
        } else {
            element.remove();
        }
    });

    return new XMLSerializer().serializeToString(xmlDoc);
};

const parseSubmissionsAsRows = (submission) => {
    // log.info('Parsing form data submissions as datagrid rows');
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
            // const parent_name = element.parentElement?.nodeName || '';
            const name = element.nodeName || '';
            // if (GROUPS_TO_SHOW.includes(parent_name) && !FIELDS_TO_HIDE.includes(name)) {
            if (!FIELDS_TO_HIDE.includes(name)) {
                return true;
            } else {
                return false;
            }
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

export const List = () => {
    const [form, setForm] = useState<Document>();
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [columns, setColumns] = useState<GridColDef[]>([]);
    const [columnVisibility, setColumnVisibility] = useState<GridColumnVisibilityModel>();
    const [rows, setRows] = useState<[]>([]);

    const { form_uid } = useParams();
    const navigate = useNavigate();

    const titleCase = (s) => s.replace(/^_*(.)|_+(.)/g, (_s, c, d) => (c ? c.toUpperCase() : ' ' + d.toUpperCase()));

    // read form definition
    useEffect(() => {
        if (form_uid) {
            readFormDefinition(form_uid).then((xmlDoc) => {
                setForm(xmlDoc);
            });
        }
    }, [form_uid]);

    // read workflow definitions
    useEffect(() => {
        if (form_uid) {
            readFormWorkflows(form_uid).then((workflows) => setWorkflows(workflows as Workflow[]));
        }
    }, [form_uid]);

    // parse form definition into columns
    useEffect(() => {
        const parseFormDefinitionAsColumns = (xmlDoc: Document) => {
            log.info('Parsing form definition as datagrid columns');

            const form = xmlDoc.body.children;
            const recurseXML = (collection: HTMLCollection, fields: Element[]) => {
                for (const element of collection) {
                    if (element.nodeName === 'group' || element.nodeName === 'repeat') {
                        recurseXML(element.children, fields);
                    } else if (element.nodeName === 'input') {
                        fields.push(element);
                    }
                }
            };

            // Get list of all fields in the form (recursing through groups and repeats)
            const fields: Element[] = [];
            recurseXML(form, fields);

            const columnVisibilityInitial = {};
            fields.filter((element) => {
                const ref = element.getAttribute('ref');
                const parent_name = ref?.split('/')[2] || '';
                const name = ref?.split('/')[3] || '';
                columnVisibilityInitial[`${parent_name}_${name}`] = !FIELDS_TO_HIDE.includes(name);
            });

            // Map fields to column definition objects
            const parsedColumns: GridColDef[] = fields.map((element) => {
                const ref = element.getAttribute('ref');
                const parent_name = ref?.split('/')[2] || '';
                const name = ref?.split('/')[3] || '';
                // const headerName = element.getElementsByTagName('label')[0].textContent;
                if (name.toLowerCase().includes('date')) {
                    return {
                        field: `${parent_name}_${name}`,
                        headerName: titleCase(name),
                        type: 'date',
                        width: 100,
                    };
                } else {
                    return {
                        field: `${parent_name}_${name}`,
                        headerName: titleCase(name),
                        width: 200,
                    };
                }
            });

            // add submission date as first column
            parsedColumns.unshift({
                field: 'submission_date',
                headerName: 'Submission Date',
                type: 'date',
                width: 100,
            });

            // add workflow actions
            if (workflows.length > 0) {
                log.info('Adding workflow actions column');
                parsedColumns.push({
                    field: 'actions',
                    type: 'actions',
                    width: 50,
                    getActions: (params) => {
                        return workflows.map((workflow) => {
                            return (
                                <GridActionsCellItem
                                    key={workflow.title}
                                    label={workflow.title}
                                    icon={<Tooltip title={workflow.title}>{<PostAddIcon />}</Tooltip>}
                                    onClick={() => {
                                        const formData = mapWorkflow(workflow, params.row);
                                        navigate(`/form/${form_uid}`, { state: { injectedData: formData } });
                                    }}
                                />
                            );
                        });
                    },
                });
            }

            return { parsedColumns, columnVisibilityInitial };
        };

        if (form) {
            const { parsedColumns, columnVisibilityInitial } = parseFormDefinitionAsColumns(form);
            setColumns(parsedColumns);
            setColumnVisibility(columnVisibilityInitial);
        }
    }, [form_uid, form, workflows, navigate]);

    // parse data as rows
    useEffect(() => {
        if (form_uid) {
            readFormData(form_uid)
                .then((data) => {
                    const jsonData = data.map((datum) => parseSubmissionsAsRows(datum));
                    setRows(jsonData);
                })
                .catch((error) => {
                    console.error(error);
                    log.error(`Error reading form data: ${error}`);
                });
        }
    }, [form_uid]);

    const onRowClick = (event) => {
        log.debug(`row clicked: ${event.row.id}`);
        navigate(`/form/details/${form_uid}/${event.row.id}`);
    };

    return (
        <>
            <Typography color="primary.dark" variant="h3" id="form-title" sx={{ marginBottom: '2rem' }}>
                {form?.title}
            </Typography>
            {columns && rows && (
                <DataGrid
                    columns={columns}
                    columnVisibilityModel={columnVisibility}
                    onColumnVisibilityModelChange={(newModel) => setColumnVisibility(newModel)}
                    rows={rows}
                    slots={{ toolbar: GridToolbar }}
                    initialState={{
                        pagination: {
                            paginationModel: {
                                pageSize: 25,
                            },
                        },
                    }}
                    logger={log}
                    onRowClick={onRowClick}
                    autoHeight
                />
            )}
        </>
    );
};

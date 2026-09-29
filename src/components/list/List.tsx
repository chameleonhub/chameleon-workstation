import { Box, Tooltip, Typography } from '@mui/material';
import { DataGrid, GridActionsCellItem, GridColDef, GridColumnVisibilityModel, GridToolbar } from '@mui/x-data-grid';
import PostAddIcon from '@mui/icons-material/PostAdd';
import { useEffect, useMemo, useState } from 'react';
import { log } from '../../helpers/log';
import { VetBackground } from '../common/VetBackground';
import {
    ChoiceLabelMaps,
    Workflow,
    applyChoiceLabels,
    buildChoiceLabelMaps,
    fieldNameParts,
    parseSubmissionsAsRows,
    readFormData,
    readFormDefinition,
    readFormWorkflows,
    recurseFormBodyFields,
    titleCase,
} from '../../helpers/formData';
import { useNavigate, useParams } from 'react-router-dom';

// const GROUPS_TO_SHOW = ['basic_info'];
const FIELDS_TO_HIDE = ['division', 'district', 'upazila']; // FIXME move out to some sort of config}

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
            element.replaceWith(newElement);
        } else {
            element.remove();
        }
    });

    return new XMLSerializer().serializeToString(xmlDoc);
};

export const List = () => {
    const [form, setForm] = useState<Document>();
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [columns, setColumns] = useState<GridColDef[]>([]);
    const [columnVisibility, setColumnVisibility] = useState<GridColumnVisibilityModel>();
    const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
    const [choiceLabelMaps, setChoiceLabelMaps] = useState<ChoiceLabelMaps>({});

    const { form_uid } = useParams();
    const navigate = useNavigate();

    // read form definition
    useEffect(() => {
        if (form_uid) {
            readFormDefinition(form_uid).then((xmlDoc) => {
                setForm(xmlDoc);
            });
        }
    }, [form_uid]);

    // resolve select/select1 field values (raw stored codes) to their human-readable choice
    // labels, e.g. "3" -> "Anthrax" - see buildChoiceLabelMaps for the resolution rules
    useEffect(() => {
        if (form && form_uid) {
            const fields = recurseFormBodyFields(form.body.children);
            buildChoiceLabelMaps(form, form_uid, fields).then(setChoiceLabelMaps);
        }
    }, [form, form_uid]);

    const rows = useMemo(() => rawRows.map((row) => applyChoiceLabels(row, choiceLabelMaps)), [rawRows, choiceLabelMaps]);

    // read workflow definitions
    useEffect(() => {
        if (form_uid) {
            readFormWorkflows(form_uid).then((workflows) => setWorkflows(workflows as Workflow[]));
        }
    }, [form_uid]);

    // parse form definition into columns
    useEffect(() => {
        const parseFormDefinitionAsColumns = (xmlDoc: Document) => {
            // log.info('Parsing form definition as datagrid columns');

            const form = xmlDoc.body.children;

            // Get list of all fields in the form (recursing through groups and repeats)
            const fields = recurseFormBodyFields(form);

            const columnVisibilityInitial = {};
            fields.filter((element) => {
                const { parent_name, name } = fieldNameParts(element);
                columnVisibilityInitial[`${parent_name}_${name}`] = !FIELDS_TO_HIDE.includes(name);
            });

            // Map fields to column definition objects
            const parsedColumns: GridColDef[] = fields.map((element) => {
                const { parent_name, name } = fieldNameParts(element);
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
                                        navigate(`/form/${workflow.destination_form}`, { state: { injectedData: formData } });
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
                    setRawRows(jsonData);
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
            <VetBackground />
            <Typography color="primary.dark" variant="h3" id="form-title" sx={{ marginBottom: '2rem' }}>
                {form?.title}
            </Typography>
            {columns && rows && (
                <Box sx={{ display: 'flex', flexDirection: 'column', backgroundColor: 'background.paper' }}>
                    <DataGrid
                        columns={columns}
                        columnVisibilityModel={columnVisibility}
                        onColumnVisibilityModelChange={(newModel) => setColumnVisibility(newModel)}
                        rows={rows}
                        showToolbar
                        slots={{ toolbar: GridToolbar }}
                        initialState={{
                            pagination: {
                                paginationModel: {
                                    pageSize: 10,
                                },
                            },
                        }}
                        pageSizeOptions={[10, 25, 50, 100]}
                        logger={log}
                        onRowClick={onRowClick}
                        autoHeight
                    />
                </Box>
            )}
        </>
    );
};

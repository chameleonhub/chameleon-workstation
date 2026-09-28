import { Tooltip, Typography } from '@mui/material';
import { DataGrid, GridActionsCellItem, GridColDef } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import { log } from '../../helpers/log';
import { escapeSqlString } from '../../helpers/sql.ts';
import { ipc } from '../../helpers/ipc';
import { useNavigate } from 'react-router-dom';
import { fetchDraftCount } from '../../stores/featues/draftCounterSlice.ts';
import { useAppDispatch } from '../../stores/store.ts';

const readDraftTableData = async () => {
    log.info(`reading data from formlocaldraft table...`);
    const query = `SELECT *
                   FROM formlocaldraft`;
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

interface Row {
    id: string;
    form_uid: string;
    form_name: string;
    instance_start: Date;
}

const parseSubmissionsAsRows = async (submissions) => {
    const parser = new DOMParser();

    const rows: Row[] = [];

    for (const submission of submissions) {
        const xmlDoc = parser.parseFromString(submission.xml, 'application/xml');

        const uuid = xmlDoc.documentElement.getElementsByTagName('instanceID')[0].textContent;

        const instance_start = new Date(xmlDoc.documentElement.getElementsByTagName('start')[0].textContent as string);

        const query = `SELECT uid, name
                       FROM form
                       WHERE uid = '${xmlDoc.documentElement.tagName}'`;

        try {
            const response = await ipc.invoke('get-local-db', query);
            if (uuid && instance_start && response[0].uid && response[0].name) {
                const row: Row = {
                    id: uuid,
                    form_uid: response[0].uid,
                    form_name: response[0].name,
                    instance_start: instance_start,
                };
                rows.push(row);
            } else {
                log.error('Error reading form data - incomplete row');
            }
        } catch (error) {
            log.error('Error reading form data:');
            log.error(error);
        }
    }
    return rows;
};

export const DraftList = () => {
    const [rows, setRows] = useState<Row[]>();
    const dispatch = useAppDispatch();

    const deleteDraft = (uuid) => {
        const query = `DELETE
                       FROM formlocaldraft
                       WHERE uuid = '${escapeSqlString(uuid)}';`;
        ipc.invoke('post-local-db', query)
            .then((response) => {
                if (response) {
                    log.info('Form draft deleted from local database successfully');
                    // Removed locally rather than navigating away and back - the row list is only
                    // ever loaded once on mount, so a navigate('/list/draft') here (the previous
                    // approach) both targeted a route that doesn't exist (list/drafts is plural -
                    // '/list/draft' actually matched the generic list/:form_uid route instead) and
                    // wouldn't have refreshed the DataGrid anyway, since navigating to the same
                    // route doesn't remount this component or its effects.
                    setRows((current) => current?.filter((row) => row.id !== uuid));
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

    const navigate = useNavigate();

    const columns: GridColDef[] = [
        {
            field: 'instance_start',
            headerName: 'Created at',
            type: 'date',
            width: 100,
        },
        {
            field: 'form_name',
            headerName: 'Form name',
            width: 200,
        },
        {
            field: 'actions',
            type: 'actions',
            width: 50,
            getActions: (params) => {
                return [
                    <GridActionsCellItem
                        key="delete"
                        label="Delete"
                        icon={<Tooltip title="Delete">{<DeleteIcon />}</Tooltip>}
                        onClick={() => {
                            if (params.row.id) {
                                deleteDraft(params.row.id);
                            }
                        }}
                    />,
                ];
            },
        },
    ];

    // read form defintion
    useEffect(() => {
        readDraftTableData().then((response) => {
            parseSubmissionsAsRows(response)
                .then((parsedResponse) => {
                    setRows(parsedResponse);
                })
                .catch((error) => {
                    log.error('Error parsing submissions as rows:');
                    log.error(error);
                });
        });
    }, []);

    const onRowClick = (event) => {
        log.debug(`row clicked: ${event.row.id}`);
        navigate(`/form/draft/${event.row.form_uid}/${event.row.id}`);
    };

    return (
        <>
            <Typography variant="h3" id="form-title" sx={{ marginBottom: '2rem' }}>
                Draft Submissions
            </Typography>
            {columns && rows && <DataGrid columns={columns} rows={rows} logger={log} onRowClick={onRowClick} autoHeight />}
        </>
    );
};

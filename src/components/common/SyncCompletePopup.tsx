import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Fade } from '@mui/material';
import { SyncFormRecordProgress, SyncResult } from '../../../electron/bahis.model.ts';
import { ipc } from '../../helpers/ipc';

const VISIBLE_MS = 3000;

// e.g. "1,234 records downloaded" / "3 of 5 drafts uploaded (2 failed)" / "No new records"
const describeFormRecords = ({ direction, completed, total, failed }: SyncFormRecordProgress) => {
    const noun = direction === 'download' ? 'record' : 'draft';
    const verb = direction === 'download' ? 'downloaded' : 'uploaded';
    const plural = (n: number) => `${n.toLocaleString()} ${n === 1 ? noun : `${noun}s`}`;

    let text: string;
    if (direction === 'upload' && total > 0) {
        text = `${completed.toLocaleString()} of ${plural(total)} ${verb}`;
    } else if (completed > 0) {
        text = `${plural(completed)} ${verb}`;
    } else {
        text = failed > 0 ? 'Not synced' : `No new ${noun}s`;
    }
    return failed > 0 ? `${text} (${failed.toLocaleString()} failed)` : text;
};

// "Sync complete: ..." plus what happened to each form, shown in the middle of the screen for a few seconds after a
// sync finishes. It is mounted at the app root rather than on a page: the sign-in sync finishes and navigates away
// straight afterwards, and a page-level component would be gone before anyone saw it.
export const SyncCompletePopup = () => {
    const [result, setResult] = useState<SyncResult | null>(null);
    // kept while fading out, so the text doesn't vanish before the alert does
    const lastResult = useRef<SyncResult | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        const unsubscribe = ipc.on('sendSyncResult', (syncResult: SyncResult) => {
            lastResult.current = syncResult;
            setResult(syncResult);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setResult(null), VISIBLE_MS);
        });
        return () => {
            unsubscribe();
            clearTimeout(timer.current);
        };
    }, []);

    const shown = result ?? lastResult.current;

    return (
        <Fade in={result !== null} timeout={{ enter: 200, exit: 400 }} unmountOnExit>
            <Box
                role="status"
                sx={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    // above the sync window (zIndex 5000), which is still up in the instant the result arrives
                    zIndex: 6000,
                }}
            >
                {shown && (
                    <Alert
                        severity={shown.hasFailures ? 'warning' : 'success'}
                        onClose={() => setResult(null)}
                        sx={{ width: 'min(38rem, 92vw)', maxHeight: '60vh', overflowY: 'auto', boxShadow: 8 }}
                    >
                        {shown.hasFailures ? 'Sync finished with problems' : 'Sync complete'}: {shown.summary}
                        {shown.forms.length > 0 && (
                            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2.5 }}>
                                {shown.forms.map((form, index) => (
                                    <li key={`${index}-${form.direction}-${form.name}`}>
                                        {form.name} {form.direction === 'download' ? '↓' : '↑'} {describeFormRecords(form)}
                                    </li>
                                ))}
                            </Box>
                        )}
                    </Alert>
                )}
            </Box>
        </Fade>
    );
};

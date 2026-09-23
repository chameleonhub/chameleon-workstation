import { Alert, Box, Card, CardContent, Grid, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { log } from '../../helpers/log';
import {
    fieldNameParts,
    getBindTypeMap,
    parseSubmissionsAsRows,
    readFormData,
    readFormDefinition,
    recurseFormBodyFields,
    titleCase,
} from '../../helpers/formData';

// Single sequential hue (dataviz skill: comparing magnitude across the categories
// of ONE field is not "distinct series" - it's one measure, so one hue, not a
// rainbow per bar/category).
const SERIES_COLOR = '#2a78d6';

const GEO_FIELD_NAMES = ['division', 'district', 'upazila'];
const MAX_CATEGORIES = 7; // dataviz skill: fold the tail into "Other" past ~7 classes
const HISTOGRAM_BINS = 6;

type WidgetKind = 'categorical' | 'numeric' | 'date';

interface FieldWidgetSpec {
    fieldKey: string;
    title: string;
    kind: WidgetKind;
}

const classifyField = (element: Element, bindTypeMap: Map<string, string>): WidgetKind | undefined => {
    const { name } = fieldNameParts(element);
    const ref = element.getAttribute('ref') || '';
    const bindType = bindTypeMap.get(ref);

    if (GEO_FIELD_NAMES.includes(name)) {
        return 'categorical';
    }
    if (element.nodeName === 'select1' || element.nodeName === 'select' || bindType === 'select1' || bindType === 'select') {
        return 'categorical';
    }
    if (bindType === 'int' || bindType === 'decimal') {
        return 'numeric';
    }
    if (bindType === 'date' || bindType === 'datetime') {
        return 'date';
    }
    // free text / unrecognized types have no natural aggregation - skip
    return undefined;
};

const monthLabel = (date: Date): string => {
    if (!date || Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
};

const StatTile = ({ label, value }: { label: string; value: string }) => (
    <Card sx={{ height: '100%' }}>
        <CardContent>
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="h4" component="p" sx={{ fontWeight: 600 }}>
                {value}
            </Typography>
        </CardContent>
    </Card>
);

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card sx={{ height: '100%' }}>
        <CardContent>
            <Typography variant="subtitle1" sx={{ marginBottom: 1 }}>
                {title}
            </Typography>
            {children}
        </CardContent>
    </Card>
);

const foldIntoOther = (counts: Map<string, number>): { labels: string[]; values: number[] } => {
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, MAX_CATEGORIES);
    const rest = sorted.slice(MAX_CATEGORIES);
    const labels = top.map(([label]) => label || '(blank)');
    const values = top.map(([, value]) => value);
    const otherTotal = rest.reduce((sum, [, value]) => sum + value, 0);
    if (otherTotal > 0) {
        labels.push('Other');
        values.push(otherTotal);
    }
    return { labels, values };
};

const CategoricalWidget = ({
    title,
    fieldKey,
    rows,
}: {
    title: string;
    fieldKey: string;
    rows: Record<string, unknown>[];
}) => {
    // MUI X Charts memoizes internally by prop reference (reselect) - series/xAxis/yAxis must be
    // stable across renders, or its tooltip selectors re-run on every render (console warnings,
    // wasted work). Compute the underlying data once per [rows, fieldKey], then build the chart
    // prop arrays from that memoized data rather than as fresh inline literals every render.
    const { labels, values } = useMemo(() => {
        const counts = new Map<string, number>();
        rows.forEach((row) => {
            const value = String(row[fieldKey] ?? '').trim();
            if (!value) return;
            counts.set(value, (counts.get(value) || 0) + 1);
        });
        return counts.size === 0 ? { labels: [] as string[], values: [] as number[] } : foldIntoOther(counts);
    }, [rows, fieldKey]);

    const series = useMemo(() => [{ data: values, color: SERIES_COLOR, label: 'Submissions' }], [values]);
    const yAxis = useMemo(() => [{ data: labels, scaleType: 'band' as const }], [labels]);
    const xAxis = useMemo(() => [{ min: 0 }], []);
    const margin = useMemo(() => ({ left: 110 }), []);

    if (labels.length === 0) {
        return (
            <ChartCard title={title}>
                <Typography variant="body2" color="text.secondary">
                    No responses yet
                </Typography>
            </ChartCard>
        );
    }

    return (
        <ChartCard title={title}>
            <BarChart
                layout="horizontal"
                height={Math.max(120, labels.length * 40)}
                yAxis={yAxis}
                xAxis={xAxis}
                series={series}
                borderRadius={4}
                hideLegend
                margin={margin}
            />
        </ChartCard>
    );
};

const NumericWidget = ({ title, fieldKey, rows }: { title: string; fieldKey: string; rows: Record<string, unknown>[] }) => {
    const stats = useMemo(() => {
        const values = rows.map((row) => Number(row[fieldKey])).filter((value) => Number.isFinite(value));
        if (values.length === 0) return undefined;

        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((sum, value) => sum + value, 0) / values.length;

        const binWidth = (max - min) / HISTOGRAM_BINS || 1;
        const bins = new Array(HISTOGRAM_BINS).fill(0);
        values.forEach((value) => {
            const idx = binWidth > 0 ? Math.min(HISTOGRAM_BINS - 1, Math.floor((value - min) / binWidth)) : 0;
            bins[idx] += 1;
        });
        const binLabels = bins.map((_, i) => {
            const lower = min + i * binWidth;
            const upper = lower + binWidth;
            return `${Math.round(lower)}–${Math.round(upper)}`;
        });

        return { min, max, avg, bins, binLabels };
    }, [rows, fieldKey]);

    const series = useMemo(() => [{ data: stats?.bins ?? [], color: SERIES_COLOR, label: 'Submissions' }], [stats]);
    const xAxis = useMemo(() => [{ data: stats?.binLabels ?? [], scaleType: 'band' as const }], [stats]);

    if (!stats) {
        return (
            <ChartCard title={title}>
                <Typography variant="body2" color="text.secondary">
                    No responses yet
                </Typography>
            </ChartCard>
        );
    }

    const { min, max, avg } = stats;

    return (
        <ChartCard title={title}>
            <Grid container spacing={1} sx={{ marginBottom: 1 }}>
                <Grid size={4}>
                    <Typography variant="caption" color="text.secondary">
                        Average
                    </Typography>
                    <Typography variant="body1">{avg.toFixed(1)}</Typography>
                </Grid>
                <Grid size={4}>
                    <Typography variant="caption" color="text.secondary">
                        Min
                    </Typography>
                    <Typography variant="body1">{min}</Typography>
                </Grid>
                <Grid size={4}>
                    <Typography variant="caption" color="text.secondary">
                        Max
                    </Typography>
                    <Typography variant="body1">{max}</Typography>
                </Grid>
            </Grid>
            <BarChart height={220} xAxis={xAxis} series={series} borderRadius={4} hideLegend />
        </ChartCard>
    );
};

const TimeSeriesWidget = ({ title, fieldKey, rows }: { title: string; fieldKey: string; rows: Record<string, unknown>[] }) => {
    const { labels, values } = useMemo(() => {
        const counts = new Map<string, number>();
        rows.forEach((row) => {
            const date = row[fieldKey] as Date;
            if (!date || Number.isNaN(new Date(date).getTime())) return;
            const label = monthLabel(new Date(date));
            counts.set(label, (counts.get(label) || 0) + 1);
        });
        const labels = [...counts.keys()];
        return { labels, values: labels.map((label) => counts.get(label) || 0) };
    }, [rows, fieldKey]);

    const series = useMemo(() => [{ data: values, color: SERIES_COLOR, label: 'Submissions' }], [values]);
    const xAxis = useMemo(() => [{ data: labels, scaleType: 'band' as const }], [labels]);

    if (labels.length === 0) {
        return (
            <ChartCard title={title}>
                <Typography variant="body2" color="text.secondary">
                    No responses yet
                </Typography>
            </ChartCard>
        );
    }

    return (
        <ChartCard title={title}>
            <LineChart height={220} xAxis={xAxis} series={series} hideLegend />
        </ChartCard>
    );
};

export const Dashboard = () => {
    const [form, setForm] = useState<Document>();
    const [rows, setRows] = useState<Record<string, unknown>[]>([]);

    const { form_uid } = useParams();

    useEffect(() => {
        if (form_uid) {
            readFormDefinition(form_uid).then((xmlDoc) => setForm(xmlDoc));
        }
    }, [form_uid]);

    useEffect(() => {
        if (form_uid) {
            readFormData(form_uid)
                .then((data) => {
                    setRows(data.map((datum) => parseSubmissionsAsRows(datum)));
                })
                .catch((error) => {
                    log.error(`Error reading form data: ${error}`);
                });
        }
    }, [form_uid]);

    const widgets = useMemo<FieldWidgetSpec[]>(() => {
        if (!form) return [];
        log.info('Deriving dashboard widgets from form definition');
        const bindTypeMap = getBindTypeMap(form);
        const fields = recurseFormBodyFields(form.body.children);

        return fields
            .map((element) => {
                const kind = classifyField(element, bindTypeMap);
                if (!kind) return undefined;
                const { parent_name, name } = fieldNameParts(element);
                return {
                    fieldKey: `${parent_name}_${name}`,
                    title: titleCase(name),
                    kind,
                } as FieldWidgetSpec;
            })
            .filter((widget): widget is FieldWidgetSpec => Boolean(widget));
    }, [form]);

    return (
        <>
            <Typography color="primary.dark" variant="h3" id="dashboard-title" sx={{ marginBottom: '2rem' }}>
                {form?.title}
            </Typography>

            {rows.length === 0 ? (
                <Alert severity="info">No submissions synced for this form yet.</Alert>
            ) : (
                <Box>
                    <Grid container spacing={2}>
                        <Grid size={{ lg: 3, md: 4, sm: 6, xs: 12 }}>
                            <StatTile label="Total submissions" value={rows.length.toLocaleString()} />
                        </Grid>
                        <Grid size={{ lg: 9, md: 8, sm: 6, xs: 12 }}>
                            <TimeSeriesWidget title="Submissions over time" fieldKey="submission_date" rows={rows} />
                        </Grid>

                        {widgets.map((widget) => (
                            <Grid key={widget.fieldKey} size={{ lg: 4, md: 6, sm: 12, xs: 12 }}>
                                {widget.kind === 'categorical' && (
                                    <CategoricalWidget title={widget.title} fieldKey={widget.fieldKey} rows={rows} />
                                )}
                                {widget.kind === 'numeric' && (
                                    <NumericWidget title={widget.title} fieldKey={widget.fieldKey} rows={rows} />
                                )}
                                {widget.kind === 'date' && (
                                    <TimeSeriesWidget title={widget.title} fieldKey={widget.fieldKey} rows={rows} />
                                )}
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}
        </>
    );
};

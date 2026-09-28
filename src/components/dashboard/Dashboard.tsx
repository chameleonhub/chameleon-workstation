import { Alert, Box, Card, CardContent, Grid, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type Highcharts from '../../helpers/highchartsConfig';
import { HighchartsChart } from './HighchartsChart';
import { log } from '../../helpers/log';
import {
    ChoiceLabelMaps,
    applyChoiceLabels,
    buildChoiceLabelMaps,
    fieldNameParts,
    getBindTypeMap,
    parseSubmissionsAsRows,
    readFormData,
    readFormDefinition,
    recurseFormBodyFields,
    titleCase,
} from '../../helpers/formData';

// Bar/column widgets use the app-wide categorical palette (highchartsConfig.ts) via
// plotOptions.bar/column.colorByPoint - one color per category/bin. The time-series line chart
// keeps a single color since it's one continuous trend, not discrete categories.
const LINE_SERIES_COLOR = '#2a78d6';

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

// Sortable "YYYY-MM" key for a given month, so chart x-axes can be ordered chronologically
// regardless of the order submissions were read from the DB (readFormData has no ORDER BY).
const monthSortKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// The numeric answers in a column. A blank answer is "no data", not 0 (Number('') is 0).
const numericValues = (rows: Record<string, unknown>[], fieldKey: string): number[] =>
    rows
        .map((row) => row[fieldKey])
        .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
        .map(Number)
        .filter((value) => Number.isFinite(value));

// Whether anyone has actually answered this field. Fields with no data at all get no widget, rather than an
// empty card ("No responses yet") or a chart of nothing.
const hasWidgetData = (widget: FieldWidgetSpec, rows: Record<string, unknown>[]): boolean => {
    switch (widget.kind) {
        case 'categorical':
            return rows.some((row) => String(row[widget.fieldKey] ?? '').trim() !== '');
        case 'numeric':
            return numericValues(rows, widget.fieldKey).length > 0;
        case 'date':
            return rows.some((row) => {
                const date = row[widget.fieldKey] as Date;
                return Boolean(date) && !Number.isNaN(new Date(date).getTime());
            });
    }
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
    // MUI Card sets overflow: hidden by default (so rounded corners clip content cleanly) - that
    // also clips the bottom of the Highcharts export menu once it's taller than the remaining
    // card height, no matter how high its z-index is: z-index only controls paint order, it can't
    // escape an ancestor's overflow clipping. Chart widgets never need their own overflow clipped,
    // so it's safe to open it up here.
    <Card sx={{ height: '100%', overflow: 'visible' }}>
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
    // HighchartsChart calls Highcharts.update() with this options object on every change - a
    // stable reference when the underlying data hasn't changed avoids needless chart rebuilds.
    const { labels, values } = useMemo(() => {
        const counts = new Map<string, number>();
        rows.forEach((row) => {
            const value = String(row[fieldKey] ?? '').trim();
            if (!value) return;
            counts.set(value, (counts.get(value) || 0) + 1);
        });
        return counts.size === 0 ? { labels: [] as string[], values: [] as number[] } : foldIntoOther(counts);
    }, [rows, fieldKey]);

    const options = useMemo<Highcharts.Options>(
        () => ({
            chart: { type: 'bar', height: Math.max(120, labels.length * 40) },
            xAxis: { categories: labels },
            yAxis: { title: { text: undefined }, min: 0, allowDecimals: false },
            series: [{ type: 'bar', name: 'Submissions', data: values }],
            exporting: { tableCaption: title },
        }),
        [labels, values, title],
    );

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
            <HighchartsChart options={options} />
        </ChartCard>
    );
};

const NumericWidget = ({ title, fieldKey, rows }: { title: string; fieldKey: string; rows: Record<string, unknown>[] }) => {
    const stats = useMemo(() => {
        const values = numericValues(rows, fieldKey);
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

    const options = useMemo<Highcharts.Options>(
        () => ({
            chart: { type: 'column', height: 220 },
            xAxis: { categories: stats?.binLabels ?? [] },
            yAxis: { title: { text: undefined }, allowDecimals: false },
            series: [{ type: 'column', name: 'Submissions', data: stats?.bins ?? [] }],
            exporting: { tableCaption: title },
        }),
        [stats, title],
    );

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
            <HighchartsChart options={options} />
        </ChartCard>
    );
};

const TimeSeriesWidget = ({ title, fieldKey, rows }: { title: string; fieldKey: string; rows: Record<string, unknown>[] }) => {
    const { labels, values } = useMemo(() => {
        const counts = new Map<string, { label: string; total: number }>();
        rows.forEach((row) => {
            const date = row[fieldKey] as Date;
            if (!date || Number.isNaN(new Date(date).getTime())) return;
            const parsed = new Date(date);
            const sortKey = monthSortKey(parsed);
            const existing = counts.get(sortKey);
            counts.set(sortKey, { label: monthLabel(parsed), total: (existing?.total || 0) + 1 });
        });
        const ordered = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
        return { labels: ordered.map(([, { label }]) => label), values: ordered.map(([, { total }]) => total) };
    }, [rows, fieldKey]);

    const options = useMemo<Highcharts.Options>(
        () => ({
            chart: { type: 'line', height: 220 },
            xAxis: { categories: labels },
            yAxis: { title: { text: undefined }, allowDecimals: false },
            series: [{ type: 'line', name: 'Submissions', data: values, color: LINE_SERIES_COLOR }],
            exporting: { tableCaption: title },
        }),
        [labels, values, title],
    );

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
            <HighchartsChart options={options} />
        </ChartCard>
    );
};

export const Dashboard = () => {
    const [form, setForm] = useState<Document>();
    const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
    const [choiceLabelMaps, setChoiceLabelMaps] = useState<ChoiceLabelMaps>({});

    const { form_uid } = useParams();

    useEffect(() => {
        if (form_uid) {
            readFormDefinition(form_uid).then((xmlDoc) => setForm(xmlDoc));
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

    useEffect(() => {
        if (form_uid) {
            readFormData(form_uid)
                .then((data) => {
                    setRawRows(data.map((datum) => parseSubmissionsAsRows(datum)));
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

    const visibleWidgets = useMemo(() => widgets.filter((widget) => hasWidgetData(widget, rows)), [widgets, rows]);

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

                        {visibleWidgets.map((widget) => (
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

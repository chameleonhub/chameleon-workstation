import Highcharts from 'highcharts';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/exporting';
import 'highcharts/modules/offline-exporting'; // client-side export (canvas-based) - no export server, works offline
import 'highcharts/modules/export-data'; // adds "View data table" / CSV / XLS to the export menu

// Matches MUI's default font stack (theme.ts doesn't override typography.fontFamily),
// so charts read as part of the same app chrome rather than a foreign widget.
const APP_FONT_FAMILY = '"Roboto","Helvetica","Arial",sans-serif';

// Standard 8-color categorical palette, one distinct color per bar/category. Bar and column
// widgets here cap at 7 categories + "Other" (see Dashboard.tsx MAX_CATEGORIES), so this never
// runs out and has to repeat a color.
export const CATEGORICAL_PALETTE = [
    '#2a78d6', // blue
    '#eb6834', // orange
    '#1baf7a', // aqua
    '#eda100', // yellow
    '#e87ba4', // magenta
    '#008300', // green
    '#4a3aa7', // violet
    '#e34948', // red
];

Highcharts.setOptions({
    colors: CATEGORICAL_PALETTE,
    chart: {
        style: {
            fontFamily: APP_FONT_FAMILY,
        },
        // Opaque, not 'transparent': the browser's native Fullscreen API (used by the export
        // menu's "View in full screen") renders the chart outside the card entirely, on a plain
        // black backdrop, so a transparent chart background shows through as black. This looks
        // identical to before against the card's own white background, but also fixes fullscreen.
        backgroundColor: '#ffffff',
    },
    credits: {
        enabled: false,
    },
    accessibility: {
        enabled: true,
        keyboardNavigation: {
            enabled: true,
        },
    },
    exporting: {
        enabled: true,
    },
    // Every widget here is a single series ("Submissions"), so the legend only ever repeats that
    // one label per chart - no identifying information, just chrome. Category identity is carried
    // by the axis labels instead (see plotOptions.bar/column colorByPoint below).
    legend: {
        enabled: false,
    },
    title: {
        text: undefined,
    },
    tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: '#c3c2b7',
        borderRadius: 6,
    },
    xAxis: {
        gridLineColor: '#e1e0d9',
        lineColor: '#c3c2b7',
        tickColor: '#c3c2b7',
        labels: {
            style: { fontSize: '11px', color: '#52514e' },
        },
    },
    yAxis: {
        gridLineColor: '#e1e0d9',
        lineColor: '#c3c2b7',
        tickColor: '#c3c2b7',
        labels: {
            style: { fontSize: '11px', color: '#52514e' },
        },
    },
    plotOptions: {
        bar: { borderRadius: 4, colorByPoint: true },
        column: { borderRadius: 4, colorByPoint: true },
        line: { lineWidth: 2 },
    },
});

export default Highcharts;

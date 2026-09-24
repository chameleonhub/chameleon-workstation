import Highcharts from 'highcharts';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/exporting';
import 'highcharts/modules/offline-exporting';
import 'highcharts/modules/export-data';

const APP_FONT_FAMILY = '"Roboto","Helvetica","Arial",sans-serif';

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

import { useEffect, useRef } from 'react';
import Highcharts from '../../helpers/highchartsConfig';

// highcharts-react-official (the official wrapper) ships an old webpack UMD bundle that assigns
// its export via bracket notation (exports["default"] = ...), which Vite/Rolldown's static
// CJS-export analysis can't detect - every import strategy tried (plain default import, namespace
// import, vite-plugin-electron-renderer's cjs resolve option, native window.require) either got
// back the wrong object or - for window.require - a second, unbundled copy of React that crashes
// with "Invalid hook call" because it isn't the same instance ReactDOM is using. The wrapper itself
// is a thin ref + Highcharts.chart()/update()/destroy() shim, so it's just reimplemented directly
// against the `highcharts` package, which bundles cleanly.
export const HighchartsChart = ({ options }: { options: Highcharts.Options }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<Highcharts.Chart | undefined>(undefined);

    useEffect(() => {
        if (!containerRef.current) return;
        chartRef.current = Highcharts.chart(containerRef.current, options);
        return () => {
            chartRef.current?.destroy();
            chartRef.current = undefined;
        };
    }, []);

    useEffect(() => {
        if (!chartRef.current) return;
        chartRef.current.update(options, true, true);
    }, [options]);

    return <div ref={containerRef} />;
};

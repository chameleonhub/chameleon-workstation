import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
    const [isFullscreen, setIsFullscreen] = useState(false);

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

    // Highcharts' own fullscreen exit is reached by reopening the same small corner menu used to
    // enter it and picking "Exit from full screen" - easy to miss since there's no other chrome
    // in fullscreen to suggest that's where it lives. Add an unmistakable dedicated button instead.
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === containerRef.current);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    return (
        <div ref={containerRef}>
            {isFullscreen &&
                containerRef.current &&
                createPortal(
                    <button
                        type="button"
                        // This sits inside the element Highcharts renders into, and Highcharts' accessibility
                        // module marks every sibling of the nodes it exposes as aria-hidden unless one is already
                        // set - hiding a button that has focus, which the browser reports as "Blocked aria-hidden
                        // on an element because its descendant retained focus".
                        aria-hidden={false}
                        onClick={() => document.exitFullscreen()}
                        style={{
                            position: 'fixed',
                            top: 16,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 10000,
                            padding: '8px 16px',
                            borderRadius: 20,
                            border: 'none',
                            background: '#2a78d6',
                            color: '#ffffff',
                            fontSize: 14,
                            fontWeight: 600,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                        }}
                    >
                        ✕ Exit full screen
                    </button>,
                    containerRef.current,
                )}
        </div>
    );
};

import { ipcRenderer } from 'electron';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const stringify = (arg: unknown): string =>
    arg instanceof Error ? `${arg.name}: ${arg.message}\n${arg.stack}` : typeof arg === 'string' ? arg : JSON.stringify(arg);

const consoleMethod: Record<LogLevel, (...args: unknown[]) => void> = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
};

// 'debug' is intentionally console-silent (matches the previous winston Console transport, which
// was pinned to level: 'info') - it still reaches react-debug.log via the IPC send below, just not
// DevTools, since debug call sites (row clicks, module loads, field replacements, ...) can be noisy
// and occasionally log data a field agent watching an open console shouldn't see by default.
const CONSOLE_LEVELS: LogLevel[] = ['error', 'warn', 'info'];

const write =
    (level: LogLevel) =>
    (...args: unknown[]) => {
        if (CONSOLE_LEVELS.includes(level)) consoleMethod[level](...args);
        ipcRenderer.send('renderer-log', level, args.map(stringify).join(' '));
    };

export const log = {
    error: write('error'),
    warn: write('warn'),
    info: write('info'),
    debug: write('debug'),
};

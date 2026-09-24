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

const write =
    (level: LogLevel) =>
    (...args: unknown[]) => {
        consoleMethod[level](...args);
        ipcRenderer.send('renderer-log', level, args.map(stringify).join(' '));
    };

export const log = {
    error: write('error'),
    warn: write('warn'),
    info: write('info'),
    debug: write('debug'),
};

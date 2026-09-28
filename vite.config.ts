import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import react from '@vitejs/plugin-react';

// Preload scripts run in a sandboxed renderer, which can only load CommonJS. The plugin would
// otherwise emit ESM (the package is "type": "module"), so they're built as plain CJS bundles.
const preloadEntry = (entry: string) => ({
    entry,
    vite: {
        build: {
            outDir: '.vite/build',
            lib: false as const,
            rollupOptions: {
                input: entry,
                output: {
                    format: 'cjs' as const,
                    entryFileNames: '[name].cjs',
                },
            },
        },
    },
    onstart(options: { reload: () => void }) {
        // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete,
        // instead of restarting the entire Electron App.
        options.reload();
    },
});

export default function ViteConfig({ mode }) {
    process.env.NODE_ENV = mode;
    const isProd = process.env.NODE_ENV === 'production';

    return defineConfig({
        plugins: [
            react(),
            electron([
                {
                    // Main-Process entry file of the Electron App.
                    entry: 'electron/main.ts',
                    vite: {
                        build: {
                            outDir: '.vite/build',
                            minify: isProd,
                        },
                    },
                    onstart(options) {
                        setTimeout(() => options.startup(), 1000);
                    },
                },
                preloadEntry('electron/preload.ts'),
                preloadEntry('electron/updatePreload.ts'),
            ]),
        ],
    });
}

import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// enketo-core's SCSS imports a widget stylesheet by an absolute path from its own monorepo
// ("/packages/enketo-core/node_modules/..."); map those onto this project's node_modules so its grid theme
// (src/assets/styles/grid.scss) can be compiled from source.
const enketoImporter = {
    findFileUrl(url: string) {
        const match = /^\/packages\/enketo-core\/(.*)$/.exec(url);
        if (!match) return null;
        const target = match[1].startsWith('node_modules/')
            ? path.resolve('node_modules', match[1].slice('node_modules/'.length))
            : path.resolve('node_modules/enketo-core', match[1]);
        return pathToFileURL(target);
    },
};

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
        css: {
            preprocessorOptions: {
                scss: {
                    importers: [enketoImporter],
                    // enketo-core still uses @import and other since-deprecated Sass syntax
                    quietDeps: true,
                    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'slash-div', 'if-function'],
                },
            },
        },
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

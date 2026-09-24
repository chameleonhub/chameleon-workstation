import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default function ViteConfig({ mode }) {
    process.env.NODE_ENV = mode;
    const isDev = process.env.NODE_ENV === 'development';
    const isProd = process.env.NODE_ENV === 'production';

    return defineConfig({
        resolve: {
            alias: {
                // this package has no "main" field, only "module"/"browser", so esbuild can't
                // resolve it under the Node platform rules that vite-plugin-electron-renderer applies
                'leaflet.gridlayer.googlemutant': path.resolve(
                    import.meta.dirname,
                    'node_modules/leaflet.gridlayer.googlemutant/dist/Leaflet.GoogleMutant.js',
                ),
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
                            minify: isProd,
                        },
                    },
                    onstart(options) {
                        setTimeout(() => options.startup(), 1000);
                    },
                },
                {
                    entry: 'electron/preload.ts',
                    vite: {
                        build: {
                            rollupOptions: {
                                output: {
                                    entryFileNames: '[name].mjs',
                                },
                            },
                        },
                    },
                    onstart(options) {
                        // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete,
                        // instead of restarting the entire Electron App.
                        options.reload();
                    },
                },
            ]),
            renderer(),
        ],
    });
}

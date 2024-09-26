import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import react from '@vitejs/plugin-react';

export default function ViteConfig({ mode }) {
    process.env.NODE_ENV = mode;
    const isDev = process.env.NODE_ENV === 'development';
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
                            minify: isProd,
                        },
                    },
                },
                {
                    entry: 'electron/preload.ts',
                    vite:{
                      build: {
                          rollupOptions:{
                              output: {
                                  entryFileNames: '[name].mjs',
                              }
                          }
                      }
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

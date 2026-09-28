/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
    interface ProcessEnv {
        /**
         * The built directory structure
         *
         * ```tree
         * ├─┬ dist            (renderer, production builds only)
         * │ └── index.html
         * │
         * ├─┬ .vite/build     (main process + preloads, dev and production)
         * │ ├── main.js
         * │ ├── preload.cjs
         * │ └── updatePreload.cjs
         * │
         * ```
         */
        DIST: string;
        /** /dist/ or /public/ */
        PUBLIC: string;
    }
}

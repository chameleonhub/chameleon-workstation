import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';

export default [
    { ignores: ['build', 'coverage', 'dist', '.vite'] },
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
    { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    eslintPluginPrettierRecommended,
    {
        // Without this, eslint-plugin-react can't tell which React version it's linting against (it
        // affects version-dependent rules, e.g. whether the new JSX runtime needs React in scope) and
        // prints "React version not specified" on every run. 'detect' reads it from the installed
        // react package instead of needing to hardcode/update a version string here.
        settings: { react: { version: 'detect' } },
        plugins: {
            'react-refresh': reactRefresh,
            'react-hooks': eslintPluginReactHooks,
        },
        rules: {
            'no-unused-vars': 'off',
            'react/react-in-jsx-scope': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
        },
    },
];

import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';

export default [
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
    { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    eslintPluginPrettierRecommended,
    {
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

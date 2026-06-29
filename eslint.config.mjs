import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'src/migrations/**',
            // The indexer is a separate workspace linted by Biome (bun run indexer:lint).
            'indexer/**',
        ],
    },
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            'no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    caughtErrors: 'all',
                    ignoreRestSiblings: false,
                    reportUsedIgnorePattern: false,
                },
            ],

            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',

            // Enforce use of the project logger (src/utils/logger.ts) instead
            // of direct console calls, which bypass structured logging and
            // environment-aware log levels.
            'no-console': 'error',
        },
    },
];

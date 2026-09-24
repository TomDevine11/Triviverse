import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'og-service/.next',
    'og-service/node_modules',
    '**/*.generated.*',
    'server/**',
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Playwright's config and specs run under Node, not the browser — without
    // node globals they trip no-undef on `process`. Linted, not ignored.
    files: ['playwright.config.js', 'e2e/**/*.js'],
    languageOptions: { globals: globals.node },
  },
])

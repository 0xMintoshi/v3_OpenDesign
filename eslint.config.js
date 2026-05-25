import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.jsx', '**/*.mjs'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'core',    pattern: 'core/**'    },
        { type: 'layout',  pattern: 'layout/**'  },
        { type: 'treatment-overlays', pattern: 'treatment-overlays/**' },
        { type: 'app',     pattern: 'app/**'     },
        { type: 'lab',     pattern: 'lab/**'     },
        { type: 'src',     pattern: 'src/**'     },
      ],
    },
    rules: {
      // Suppress React-import warnings from React 17+ JSX transform
      'no-unused-vars': ['warn', { varsIgnorePattern: '^React$', argsIgnorePattern: '^_' }],
      'boundaries/dependencies': ['error', {
        default: 'disallow',
        rules: [
          { from: 'core',    allow: [] },
          { from: 'layout',  allow: ['core'] },
          { from: 'treatment-overlays', allow: ['core', 'layout'] },
          { from: 'app',     allow: ['core', 'layout', 'treatment-overlays'] },
          { from: 'lab',     allow: ['core', 'layout', 'treatment-overlays'] },
          { from: 'src',     allow: ['core', 'layout', 'treatment-overlays', 'app', 'lab'] },
        ],
      }],
    },
  },
];

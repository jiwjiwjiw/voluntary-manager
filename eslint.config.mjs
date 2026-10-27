// Same configuration as src/sheets-tools/eslint.config.mjs and invoice-manager;
// keep the three in sync.
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

const nodeGlobals = {
  require: 'readonly',
  module: 'writable',
  process: 'readonly',
  console: 'readonly',
  __dirname: 'readonly'
}

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended],
    // Required by typescript-eslint when more than one tsconfig.json is in
    // reach (src/sheets-tools has its own).
    languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
    rules: {
      // Apps Script code throws plain strings on purpose: they are shown to the
      // user as-is in a dialog.
      '@typescript-eslint/only-throw-error': 'off',
      // Spreadsheet cell values are untyped by nature.
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: nodeGlobals }
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: nodeGlobals }
  }
)

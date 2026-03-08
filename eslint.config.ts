import path from 'node:path'
import eslintConfigPrettier from 'eslint-config-prettier'
import tslint from 'typescript-eslint'

export default [
  {
    ignores: ['dist/'],
  },
  ...tslint.configs.strictTypeChecked,
  ...tslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: path.resolve(),
      },
    },
    rules: {
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
    },
  },
  eslintConfigPrettier,
]

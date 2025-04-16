import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest,
			},
			parserOptions: {
				project: './tsconfig.json',
				sourceType: 'module',
			},
		},
		plugins: {
			import: importPlugin,
			prettier: prettierPlugin,
		},
		rules: {
			'@typescript-eslint/explicit-function-return-type': 'error',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/no-unnecessary-condition': 'error',
			'@typescript-eslint/return-await': ['error', 'always'],
			'@typescript-eslint/restrict-plus-operands': 'error',
			'@typescript-eslint/restrict-template-expressions': 'error',
			'import/order': ['error', {
				'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
				'newlines-between': 'always',
				'alphabetize': { 'order': 'asc', 'caseInsensitive': true }
			}],
			'prettier/prettier': 'error',
			'no-console': 'warn',
			'eqeqeq': ['error', 'always'],
			'curly': ['error', 'all'],
			'no-else-return': 'error',
			'spaced-comment': ['error', 'always'],
			'no-return-await': 'off',
		},
	},
	{
		files: ['**/*.test.ts', '**/*.spec.ts'],
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
	{
		ignores: ['.eslintrc.js', 'dist', 'node_modules', 'coverage'],
	}
);

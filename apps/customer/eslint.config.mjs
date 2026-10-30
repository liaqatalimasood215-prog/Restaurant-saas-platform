import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'next-env.d.ts']),
  {
    // PROJECT_RULES.md §16: screens get data only through the ApiClient, never from demo data directly.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/api/demo', '@/lib/api/demo/*', '**/lib/api/demo', '**/lib/api/demo/*'],
              message: 'Screens use the ApiClient from "@/lib/api" only. Never import demo data directly.',
            },
          ],
        },
      ],
    },
  },
]);

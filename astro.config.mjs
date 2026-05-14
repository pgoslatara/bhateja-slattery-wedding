import { defineConfig } from 'astro/config';

const SITE_URL = process.env.SITE_URL ?? 'https://example.github.io';

export default defineConfig({
  site: SITE_URL,
  base: '/bhateja-slattery-wedding',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'hi'],
    routing: { prefixDefaultLocale: false }
  },
  build: {
    format: 'directory'
  }
});

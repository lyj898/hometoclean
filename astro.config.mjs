// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://hometoclean.com',
  output: 'static',
  // Trailing slash on everything except root. Must stay 'always' and must match
  // the canonical URLs and the _redirects rules, or we duplicate ranking signal
  // across slash / no-slash variants.
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});

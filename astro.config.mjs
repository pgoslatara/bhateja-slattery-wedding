import { defineConfig } from 'astro/config';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

const SITE_URL = process.env.SITE_URL ?? 'https://example.github.io';

// Tag every id'd heading with `deep-link-target` so it picks up the shared
// hash-target pulse animation (CSS in src/styles/global.css).
function rehypeMarkHeadingsAsDeepLinkTargets() {
  return (tree) => {
    const walk = (node) => {
      if (
        node.type === 'element' &&
        /^h[1-6]$/.test(node.tagName) &&
        node.properties &&
        node.properties.id
      ) {
        const existing = node.properties.className || [];
        const classes = Array.isArray(existing) ? existing : [existing];
        if (!classes.includes('deep-link-target')) classes.push('deep-link-target');
        node.properties.className = classes;
      }
      if (Array.isArray(node.children)) node.children.forEach(walk);
    };
    walk(tree);
  };
}

export default defineConfig({
  site: SITE_URL,
  base: '/bhateja-slattery-wedding',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'hi'],
    routing: { prefixDefaultLocale: false }
  },
  markdown: {
    rehypePlugins: [
      rehypeSlug,
      rehypeMarkHeadingsAsDeepLinkTargets,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: {
            className: ['anchor-link'],
            'data-anchor-link': ''
          },
          content: { type: 'text', value: '#' }
        }
      ]
    ]
  },
  build: {
    format: 'directory'
  }
});

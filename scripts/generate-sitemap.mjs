import fs from 'node:fs';
import path from 'node:path';

import { SITE_URL, staticPages } from './site-pages.mjs';

const articlesPath = path.resolve('src/data/articles.json');
const outputPath = path.resolve('public/sitemap.xml');

const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));

const staticUrls = staticPages.map(
  (page) => `${SITE_URL}${page.path === '/' ? '/' : page.path}`
);

const articleUrls = articles.map((article) => {
  if (!article.slug) {
    throw new Error(`Article ${article.id} has no slug.`);
  }

  return `${SITE_URL}/article/${article.slug}`;
});

const urls = [...staticUrls, ...articleUrls];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
  </url>`
  )
  .join('\n')}
</urlset>
`;

fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
});

fs.writeFileSync(outputPath, sitemap);

console.log(`Generated sitemap with ${urls.length} URLs.`);

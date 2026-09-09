import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://scienceglimpse.org';

const articlesPath = path.resolve('src/data/articles.json');
const outputPath = path.resolve('public/sitemap.xml');

const articles = JSON.parse(
  fs.readFileSync(articlesPath, 'utf8')
);

const staticPages = [
  '/',
  '/about',
  '/articles',
  '/classes',
  '/events',
  '/members',
  '/submission',
  '/contact',
  '/game',
  '/leaderboard',
];

const staticUrls = staticPages.map(
  (page) => `${SITE_URL}${page}`
);

const articleUrls = articles.map(
  (article) =>
    `${SITE_URL}/article?id=${encodeURIComponent(String(article.id))}`
);

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
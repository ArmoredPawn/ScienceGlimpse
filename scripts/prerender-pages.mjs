import fs from 'node:fs';
import path from 'node:path';

import { SITE_NAME, SITE_URL, staticPages } from './site-pages.mjs';

const distDir = path.resolve('dist');
const templatePath = path.join(distDir, 'index.html');
const articlesPath = path.resolve('src/data/articles.json');

const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
const template = fs.readFileSync(templatePath, 'utf8');

const escapeAttribute = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Every replacement must actually match. A silent miss would ship a page
// carrying the site-wide tags instead of its own.
const replaceOrFail = (html, pattern, replacement, label) => {
  if (!pattern.test(html)) {
    throw new Error(
      `prerender-pages: could not find ${label} in dist/index.html. ` +
        `The template changed — update this script.`,
    );
  }

  return html.replace(pattern, () => replacement);
};

const metaPattern = (attribute, name) =>
  new RegExp(
    `<meta\\s+${attribute}=["']${name}["']\\s+content=["'][^"']*["']\\s*/?>`,
    'i',
  );

const replaceMeta = (html, attribute, name, content) =>
  replaceOrFail(
    html,
    metaPattern(attribute, name),
    `<meta ${attribute}="${name}" content="${escapeAttribute(content)}" />`,
    `<meta ${attribute}="${name}">`,
  );

const setTitle = (html, title) =>
  replaceOrFail(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeAttribute(title)}</title>`,
    '<title>',
  );

const appendToHead = (html, lines) =>
  replaceOrFail(
    html,
    /<\/head>/i,
    `    ${lines.join('\n    ')}\n  </head>`,
    '</head>',
  );

/*
 * The article text, written straight into #root.
 *
 * Meta tags alone told a crawler what a page was about but gave it nothing
 * to read — #root shipped empty, so the words only existed after Google's
 * second, JS-rendering pass. Emitting the text here puts it in the first
 * response instead.
 *
 * main.tsx mounts with createRoot(), not hydrateRoot(), and React clears a
 * container on initial render — so this markup is replaced wholesale the
 * moment the bundle runs. It is a crawler payload and a first paint, never
 * something React reconciles against, which is why no hydration mismatch
 * is possible here. The inline styles keep that first paint readable for
 * anyone on a slow connection.
 */
const renderArticleBody = (article) => {
  const paragraphs = String(article.content)
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p>${escapeAttribute(paragraph).replace(/\r?\n/g, '<br />')}</p>`,
    )
    .join('\n');

  const references =
    Array.isArray(article.references) && article.references.length > 0
      ? `<h2>References</h2><ol>${article.references
          .map((reference) => {
            const label = escapeAttribute(reference.title ?? '');

            const link = reference.url
              ? `<a href="${escapeAttribute(reference.url)}" rel="noopener noreferrer">${label}</a>`
              : label;

            return `<li>${
              reference.author ? `${escapeAttribute(reference.author)}, ` : ''
            }${link}</li>`;
          })
          .join('')}</ol>`
      : '';

  const image = article.thumbnail
    ? `<img src="${escapeAttribute(article.thumbnail)}" alt="${escapeAttribute(
        article.title,
      )}" style="width:100%;border-radius:.75rem;margin:1.5rem 0" />`
    : '';

  return [
    '<div id="root">',
    '<main style="max-width:48rem;margin:0 auto;padding:5rem 1rem 2rem;',
    'font-family:system-ui,-apple-system,sans-serif;line-height:1.7">',
    '<article>',
    `<h1 style="font-size:2.25rem;font-weight:700;margin-bottom:.5rem">${escapeAttribute(
      article.title,
    )}</h1>`,
    `<p style="opacity:.7">By ${escapeAttribute(
      article.author ?? 'ScienceGlimpse Contributor',
    )}${article.date ? ` &bull; ${escapeAttribute(article.date)}` : ''}</p>`,
    image,
    paragraphs,
    references,
    '</article>',
    '</main>',
    '</div>',
  ].join('');
};

const truncate = (text) => {
  const clean = String(text).replace(/\s+/g, ' ').trim();

  return clean.length > 160 ? `${clean.slice(0, 157)}...` : clean;
};

/*
 * Written in both layouts so a path resolves whichever way the host handles
 * extensionless URLs: some serve <name>.html, others <name>/index.html.
 * Both carry the same canonical URL, so search engines consolidate them.
 */
const writePage = (routePath, html) => {
  const relative = routePath.replace(/^\/+/, '');

  const outputPaths = [
    path.join(distDir, `${relative}.html`),
    path.join(distDir, relative, 'index.html'),
  ];

  for (const outputPath of outputPaths) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html);
  }
};

const buildArticlePage = (article) => {
  const articleUrl = `${SITE_URL}/article/${article.slug}`;

  const description = truncate(
    article.excerpt || article.content || article.title,
  );

  const imageUrl = article.thumbnail
    ? new URL(article.thumbnail, SITE_URL).href
    : `${SITE_URL}/favicon.png`;

  let html = setTitle(template, `${article.title} | ${SITE_NAME}`);

  html = replaceMeta(html, 'name', 'description', description);
  html = replaceMeta(html, 'property', 'og:type', 'article');
  html = replaceMeta(html, 'property', 'og:title', article.title);
  html = replaceMeta(html, 'property', 'og:description', description);
  html = replaceMeta(html, 'property', 'og:image', imageUrl);
  html = replaceMeta(html, 'name', 'twitter:image', imageUrl);

  // The template's twitter:site points at the project scaffold's account.
  html = html.replace(metaPattern('name', 'twitter:site'), '');

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description,
    image: imageUrl,
    url: articleUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    author: {
      '@type': 'Person',
      name: article.author || 'ScienceGlimpse Contributor',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    ...(article.date
      ? { datePublished: article.date, dateModified: article.date }
      : {}),
  };

  html = appendToHead(html, [
    `<link rel="canonical" href="${escapeAttribute(articleUrl)}" />`,
    `<meta property="og:url" content="${escapeAttribute(articleUrl)}" />`,
    `<meta name="twitter:title" content="${escapeAttribute(article.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}" />`,
    `<meta name="robots" content="index, follow" />`,
    // Prevent a literal </script> inside the JSON from closing the tag early.
    `<script type="application/ld+json">${JSON.stringify(
      structuredData,
    ).replace(/</g, '\\u003c')}</script>`,
  ]);

  return replaceOrFail(
    html,
    /<div id="root">\s*<\/div>/i,
    renderArticleBody(article),
    'the empty <div id="root">',
  );
};

const buildStaticPage = (page) => {
  const pageUrl = `${SITE_URL}${page.path}`;
  const fullTitle = `${page.title} | ${SITE_NAME}`;
  const description = truncate(page.description);

  let html = setTitle(template, fullTitle);

  html = replaceMeta(html, 'name', 'description', description);
  html = replaceMeta(html, 'property', 'og:title', fullTitle);
  html = replaceMeta(html, 'property', 'og:description', description);
  html = html.replace(metaPattern('name', 'twitter:site'), '');

  return appendToHead(html, [
    `<link rel="canonical" href="${escapeAttribute(pageUrl)}" />`,
    `<meta property="og:url" content="${escapeAttribute(pageUrl)}" />`,
    `<meta name="twitter:title" content="${escapeAttribute(fullTitle)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}" />`,
    `<meta name="robots" content="index, follow" />`,
  ]);
};

const seenSlugs = new Set();
let articleCount = 0;

for (const article of articles) {
  if (typeof article.slug !== 'string' || article.slug.length === 0) {
    throw new Error(`prerender-pages: article ${article.id} has no slug.`);
  }

  if (seenSlugs.has(article.slug)) {
    throw new Error(`prerender-pages: duplicate slug "${article.slug}".`);
  }

  seenSlugs.add(article.slug);

  writePage(`/article/${article.slug}`, buildArticlePage(article));
  articleCount += 1;
}

let staticCount = 0;

for (const page of staticPages) {
  if (page.prerender === false) {
    continue;
  }

  if (!page.title || !page.description) {
    throw new Error(
      `prerender-pages: ${page.path} needs a title and a description.`,
    );
  }

  writePage(page.path, buildStaticPage(page));
  staticCount += 1;
}

console.log(
  `Pre-rendered ${articleCount} article pages and ${staticCount} static pages.`,
);

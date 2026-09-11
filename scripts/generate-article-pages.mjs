import fs from 'node:fs';
import path from 'node:path';

const SITE_NAME = 'ScienceGlimpse';
const SITE_URL = 'https://scienceglimpse.org';

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
// carrying the site-wide tags instead of the article's own.
const replaceOrFail = (html, pattern, replacement, label) => {
  if (!pattern.test(html)) {
    throw new Error(
      `generate-article-pages: could not find ${label} in dist/index.html. ` +
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

const buildDescription = (article) => {
  const source = article.excerpt || article.content || article.title;

  const clean = String(source).replace(/\s+/g, ' ').trim();

  return clean.length > 160 ? `${clean.slice(0, 157)}...` : clean;
};

const buildStructuredData = (article, articleUrl, description, imageUrl) => {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description,
    image: imageUrl,
    url: articleUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
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

  // Prevent a literal </script> inside the JSON from closing the tag early.
  return JSON.stringify(data).replace(/</g, '\\u003c');
};

const buildPage = (article) => {
  const articleUrl = `${SITE_URL}/article/${article.slug}`;
  const description = buildDescription(article);

  const imageUrl = article.thumbnail
    ? new URL(article.thumbnail, SITE_URL).href
    : `${SITE_URL}/favicon.png`;

  let html = template;

  html = replaceOrFail(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeAttribute(`${article.title} | ${SITE_NAME}`)}</title>`,
    '<title>',
  );

  html = replaceMeta(html, 'name', 'description', description);
  html = replaceMeta(html, 'property', 'og:type', 'article');
  html = replaceMeta(html, 'property', 'og:title', article.title);
  html = replaceMeta(html, 'property', 'og:description', description);
  html = replaceMeta(html, 'property', 'og:image', imageUrl);
  html = replaceMeta(html, 'name', 'twitter:image', imageUrl);

  // The template's twitter:site points at the project scaffold's account.
  html = html.replace(metaPattern('name', 'twitter:site'), '');

  const head = [
    `<link rel="canonical" href="${escapeAttribute(articleUrl)}" />`,
    `<meta property="og:url" content="${escapeAttribute(articleUrl)}" />`,
    `<meta name="twitter:title" content="${escapeAttribute(article.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<script type="application/ld+json">${buildStructuredData(
      article,
      articleUrl,
      description,
      imageUrl,
    )}</script>`,
  ].join('\n    ');

  return replaceOrFail(html, /<\/head>/i, `    ${head}\n  </head>`, '</head>');
};

const seen = new Set();
let written = 0;

for (const article of articles) {
  if (typeof article.slug !== 'string' || article.slug.length === 0) {
    throw new Error(
      `generate-article-pages: article ${article.id} has no slug.`,
    );
  }

  if (seen.has(article.slug)) {
    throw new Error(
      `generate-article-pages: duplicate slug "${article.slug}".`,
    );
  }

  seen.add(article.slug);

  const html = buildPage(article);

  // Written in both layouts so /article/<slug> resolves whichever way the
  // host handles extensionless paths: some serve <slug>.html, others
  // <slug>/index.html. Both carry the same canonical URL, so search engines
  // consolidate them regardless of which one gets served.
  const outputPaths = [
    path.join(distDir, 'article', `${article.slug}.html`),
    path.join(distDir, 'article', article.slug, 'index.html'),
  ];

  for (const outputPath of outputPaths) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html);
  }

  written += 1;
}

console.log(
  `Generated ${written} pre-rendered article pages (${written * 2} files).`,
);

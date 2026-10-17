import fs from 'node:fs';
import path from 'node:path';

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/*
 * One-time (re-runnable) seed: load src/data/articles.json into the Firestore
 * articles collection, one document per article keyed by slug. Safe to run
 * again — writing to the same slug updates in place rather than duplicating.
 *
 * This needs admin access, so it uses a service-account key. Pass the key as
 * the first argument or via GOOGLE_APPLICATION_CREDENTIALS:
 *
 *   node scripts/seed-articles.mjs ./path/to/serviceAccount.json
 *
 * The key is full admin access to the project — keep it OUT of the repo.
 */

const keyPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keyPath) {
  console.error(
    'No service-account key. Usage:\n' +
      '  node scripts/seed-articles.mjs ./path/to/serviceAccount.json'
  );
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`Service-account key not found at: ${keyPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(keyPath), 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const articlesPath = path.resolve('src/data/articles.json');
const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));

// The account running the seed owns the imported articles.
const seededBy = serviceAccount.client_email || 'seed-script';

let written = 0;
const now = FieldValue.serverTimestamp();

for (const article of articles) {
  if (!article.slug) {
    throw new Error(`Article ${article.id} has no slug; cannot seed it.`);
  }

  const ref = db.collection('articles').doc(article.slug);

  // Don't reset createdAt / createdBy if the document already exists.
  const existing = await ref.get();

  const doc = {
    slug: article.slug,
    title: article.title ?? '',
    excerpt: article.excerpt ?? '',
    content: article.content ?? '',
    // A few legacy articles store category as a bare string; normalize to a
    // single-element array so every document matches the rules (category is a
    // list) and the other 32 articles. The app renders both shapes identically.
    category: Array.isArray(article.category)
      ? article.category
      : article.category
        ? [article.category]
        : [],
    author: article.author ?? '',
    readTime: article.readTime ?? '',
    thumbnail: article.thumbnail ?? '',
    date: article.date ?? '',
    references: Array.isArray(article.references) ? article.references : [],
    legacyId: typeof article.id === 'number' ? article.id : null,
    status: 'published',
    updatedAt: now,
    ...(existing.exists
      ? {}
      : {
          createdAt: now,
          createdBy: seededBy,
          publishedAt: now,
        }),
  };

  await ref.set(doc, { merge: true });
  written += 1;
  console.log(`  ${existing.exists ? 'updated' : 'created'} ${article.slug}`);
}

console.log(`\nSeeded ${written} articles into the articles collection.`);
process.exit(0);

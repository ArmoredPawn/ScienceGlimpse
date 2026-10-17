import fs from 'node:fs';
import path from 'node:path';

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  limit,
  getDocs,
} from 'firebase/firestore';

/*
 * Build-time snapshot of the articles collection.
 *
 * Articles are edited in Firestore (via the Admin dashboard), but the live
 * site stays a static, SEO-friendly build on GitHub Pages. So at build time
 * we pull every published article and regenerate src/data/articles.json in
 * the shape the app already imports — nothing in the app has to change, and
 * visitors never read Firestore directly (which keeps us on the free tier).
 *
 * This reads with the public web config and relies on the Firestore rules,
 * which allow anyone to read articles where status == 'published'. No
 * service-account key is involved here.
 */

// Same public config as src/lib/firebase.ts. These keys are not secrets;
// Firestore rules are what actually protect the data.
const firebaseConfig = {
  apiKey: 'AIzaSyBApcpHIobeNWoYxY1VRDxwLLChoHWSG_c',
  authDomain: 'scienceglimpse-8a217.firebaseapp.com',
  projectId: 'scienceglimpse-8a217',
  storageBucket: 'scienceglimpse-8a217.firebasestorage.app',
  messagingSenderId: '172691694210',
  appId: '1:172691694210:web:357d2d44ba06cd06ffca9b',
};

const outputPath = path.resolve('src/data/articles.json');

// Reduce a Firestore document to the exact shape the app consumes, so the
// generated file is a drop-in replacement for the hand-written one.
const toArticle = (data) => ({
  id: data.legacyId ?? data.id,
  slug: data.slug,
  title: data.title,
  excerpt: data.excerpt ?? '',
  category: Array.isArray(data.category) ? data.category : [],
  author: data.author ?? '',
  readTime: data.readTime ?? '',
  thumbnail: data.thumbnail ?? '',
  date: data.date ?? '',
  references: Array.isArray(data.references) ? data.references : [],
  content: data.content ?? '',
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// The public list rule caps a single query at 1000 docs; an explicit limit
// is required or Firestore rejects the query. Raise this (and the rule) in
// lockstep if the published count ever approaches the cap.
const snapshot = await getDocs(
  query(
    collection(db, 'articles'),
    where('status', '==', 'published'),
    limit(1000)
  )
);

const articles = snapshot.docs
  .map((doc) => toArticle(doc.data()))
  .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

// Never clobber a good snapshot with an empty one: a transient failure or a
// rules misconfig would otherwise erase every article from the site.
if (articles.length === 0) {
  throw new Error(
    'Fetched 0 published articles from Firestore — refusing to overwrite ' +
      'src/data/articles.json. Check connectivity and that articles exist ' +
      'with status == "published".'
  );
}

const missingSlug = articles.find((article) => !article.slug);
if (missingSlug) {
  throw new Error(
    `Article ${missingSlug.id} has no slug; every article needs one.`
  );
}

fs.writeFileSync(outputPath, `${JSON.stringify(articles, null, 2)}\n`);

console.log(
  `Fetched ${articles.length} published articles into src/data/articles.json.`
);

// The client SDK keeps a connection open; exit so the build step doesn't hang.
process.exit(0);

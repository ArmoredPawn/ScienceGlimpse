import React, { useEffect } from 'react';
import {
  Link,
  Navigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Coins } from 'lucide-react';
import articles from '../data/articles.json';
import highlightContentWithGlossary from '@/lib/glossary';
import { useArticleReadingReward } from '@/hooks/useArticleReadingReward';

const SITE_NAME = 'ScienceGlimpse';
const SITE_URL = 'https://scienceglimpse.org';

const updateMetaTag = (
  attribute: 'name' | 'property',
  value: string,
  content: string
) => {
  let metaTag = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${value}"]`
  );

  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.setAttribute(attribute, value);
    document.head.appendChild(metaTag);
  }

  metaTag.setAttribute('content', content);
};

const updateCanonicalUrl = (url: string) => {
  let canonicalLink = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );

  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }

  canonicalLink.setAttribute('href', url);
};

const Article = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  // Legacy /article?id=N links stay alive and redirect to the slug URL.
  const legacyId = Number(searchParams.get('id'));

  const article = slug
    ? articles.find(
        (currentArticle) => currentArticle.slug === slug
      )
    : articles.find(
        (currentArticle) =>
          Number(currentArticle.id) === legacyId
      );

  const {
    articleRef,
    rewarded,
    isActivelyReading,
    loading: readingLoading,
    errorMessage: readingError,
    signedIn,
  } = useArticleReadingReward(
    article ? String(article.id) : null
  );

  useEffect(() => {
    window.scrollTo(0, 0);

    const structuredDataId = 'article-structured-data';
    const existingStructuredData =
      document.getElementById(structuredDataId);

    if (existingStructuredData) {
      existingStructuredData.remove();
    }

    if (!article) {
      document.title = `Article Not Found | ${SITE_NAME}`;

      updateMetaTag(
        'name',
        'description',
        'The requested ScienceGlimpse article could not be found.'
      );

      updateMetaTag('name', 'robots', 'noindex, nofollow');

      return;
    }

    const articleUrl = `${SITE_URL}/article/${article.slug}`;

    const descriptionSource =
      article.excerpt || article.content || article.title;

    const cleanDescription = descriptionSource
      .replace(/\s+/g, ' ')
      .trim();

    const description =
      cleanDescription.length > 160
        ? `${cleanDescription.slice(0, 157)}...`
        : cleanDescription;

    const imageUrl = article.thumbnail
      ? new URL(article.thumbnail, SITE_URL).href
      : `${SITE_URL}/favicon.ico`;

    document.title = `${article.title} | ${SITE_NAME}`;

    updateMetaTag('name', 'description', description);
    updateMetaTag('name', 'robots', 'index, follow');

    updateMetaTag('property', 'og:type', 'article');
    updateMetaTag('property', 'og:site_name', SITE_NAME);
    updateMetaTag('property', 'og:title', article.title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:url', articleUrl);
    updateMetaTag('property', 'og:image', imageUrl);

    updateMetaTag(
      'name',
      'twitter:card',
      'summary_large_image'
    );
    updateMetaTag('name', 'twitter:title', article.title);
    updateMetaTag(
      'name',
      'twitter:description',
      description
    );
    updateMetaTag('name', 'twitter:image', imageUrl);

    updateCanonicalUrl(articleUrl);

    const structuredData = {
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
        ? {
            datePublished: article.date,
            dateModified: article.date,
          }
        : {}),
    };

    const structuredDataScript =
      document.createElement('script');

    structuredDataScript.id = structuredDataId;
    structuredDataScript.type = 'application/ld+json';
    structuredDataScript.textContent =
      JSON.stringify(structuredData);

    document.head.appendChild(structuredDataScript);

    return () => {
      document
        .getElementById(structuredDataId)
        ?.remove();
    };
  }, [article]);

  if (!slug && article) {
    return (
      <Navigate to={`/article/${article.slug}`} replace />
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl text-muted-foreground">
          Article not found.
        </p>

        <Button
          onClick={() => window.history.back()}
          className="mt-4"
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <Navigation />

      <main className="relative z-10 pt-20 max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <article ref={articleRef}>
          <header>
            <h1 className="text-4xl font-bold mb-4">
              {article.title}
            </h1>

            <p className="text-muted-foreground mb-4">
              By {article.author} • {article.date}
            </p>

            <div className="mb-6 rounded-xl border border-border bg-card p-4">
              {!signedIn ? (
                <div className="flex items-start gap-3">
                  <Coins className="mt-0.5 h-5 w-5 text-primary" />

                  <p className="text-sm text-muted-foreground">
                    <Link
                      to="/login"
                      className="font-medium text-primary hover:underline"
                    >
                      Log in
                    </Link>{' '}
                    and actively read for four minutes to earn 10
                    tokens.
                  </p>
                </div>
              ) : readingLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading reading progress...
                </p>
              ) : rewarded ? (
                <div
                  className="flex items-center gap-3"
                  aria-live="polite"
                >
                  <Coins className="h-6 w-6 text-primary" />

                  <div>
                    <p className="font-semibold">
                      10 tokens earned
                    </p>

                    <p className="text-sm text-muted-foreground">
                      You completed this article&apos;s reading
                      reward.
                    </p>
                  </div>
                </div>
              ) : (
                <div aria-live="polite">
                  <div className="flex items-start gap-3">
                    <Coins className="mt-0.5 h-5 w-5 text-primary" />

                    <div>
                      <p className="font-medium">
                        Earn 10 tokens
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Actively read this article for four minutes to earn
                        the reward.
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    {isActivelyReading
                      ? 'Your active reading time is being counted.'
                      : 'Reading is paused — return to the article and interact with the page.'}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Reading pauses when this tab is hidden or after 60
                    seconds without activity.
                  </p>

                  {readingError && (
                    <p
                      role="alert"
                      className="mt-2 text-sm text-destructive"
                    >
                      {readingError}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="aspect-video mb-6 rounded-lg overflow-hidden">
              <img
                src={article.thumbnail}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          </header>

          <div className="text-lg leading-relaxed text-foreground">
            <div className="whitespace-pre-line">
              {highlightContentWithGlossary(article.content)}
            </div>
          </div>

          {article.references &&
            article.references.length > 0 && (
              <div className="mt-12 border-t pt-8">
                <h2 className="text-2xl font-bold mb-4">
                  References
                </h2>

                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  {article.references.map((reference, index) => (
                    <li key={index}>
                      {reference.author && (
                        <span>{reference.author}, </span>
                      )}

                      {reference.url ? (
                        <a
                          href={reference.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground transition-colors"
                        >
                          {reference.title}
                        </a>
                      ) : (
                        <span>{reference.title}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
        </article>
      </main>
    </div>
  );
};

export default Article;
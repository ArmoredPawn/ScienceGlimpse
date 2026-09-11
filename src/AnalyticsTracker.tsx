// AnalyticsTracker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import articles from "./data/articles.json";

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag === "function") {
      // Get the current browser route and query string
      const pagePath = `${location.pathname}${location.search}`;

      // Send standard GA4 page_view event
      window.gtag("event", "page_view", {
        page_path: pagePath,
        page_location: window.location.href,
        page_title: document.title,
      });

      // Optional: send a custom article_view event if the route is /article/<slug>
      const match = location.pathname.match(
        /^\/article\/([^/]+)\/?$/,
      );

      if (match) {
        const articleSlug = decodeURIComponent(match[1]);

        const article = articles.find(
          (currentArticle) => currentArticle.slug === articleSlug,
        );

        // Keep article_id reporting continuous with the old ?id= URLs.
        const articleId = article
          ? String(article.id)
          : articleSlug;

        const articleElement = document.querySelector("h1");
        const articleTitle = articleElement
          ? articleElement.textContent
          : article?.title ?? `Article ${articleId}`;

        window.gtag("event", "article_view", {
          article_id: articleId,
          article_slug: articleSlug,
          article_title: articleTitle,
          page_path: pagePath,
          page_location: window.location.href,
        });
      }
    }
  }, [location]);

  return null;
}
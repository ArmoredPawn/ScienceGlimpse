import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Clock, User } from 'lucide-react';
import articles from '../data/article-summaries.json';

const HotSights = () => {
  const hotArticleIds = [3, 5, 7, 11];
  const hotArticles = articles.filter((article) =>
    hotArticleIds.includes(article.id)
  );

  return (
    <section className="py-20 px-6 bg-gradient-to-r from-indigo-500/40 via-purple-800/40 to-indigo-900/40 ring-1 ring-orange-400/25 shadow-[0_0_12px_rgba(255,99,71,0.15)]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-orange-700 dark:text-orange-400 mb-4 flex items-center justify-center gap-2">
            <span className="text-4xl md:text-5xl animate-pulse">🔥</span>
            Hot Sights
          </h2>

          <p className="text-lg text-foreground/90 max-w-2xl mx-auto">
            A few of our favorite articles to start with.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {hotArticles.map((article) => (
            <div
              key={article.id}
              className="group flex flex-col bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_16px_2px_rgba(251,146,60,0.25)] hover:ring-1 hover:ring-orange-400/60"
            >

              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
                    {Array.isArray(article.category)
                      ? article.category.join(', ')
                      : article.category || 'Science'}
                  </span>

                  <Clock className="w-3 h-3" />
                  <span>{article.readTime || '5 min'}</span>
                </div>

                <h3 className="text-lg font-semibold leading-snug text-foreground group-hover:text-orange-700 dark:group-hover:text-orange-400 group-hover:drop-shadow-[0_0_6px_rgba(251,146,60,0.4)] transition-colors duration-300">
                  {article.title}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {article.excerpt}
                </p>

                <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span>{article.author}</span>
                  </div>

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                  >
                    <Link to={`/article/${article.slug}`}>
                      Read Now
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HotSights;
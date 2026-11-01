import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import articles from '../data/article-summaries.json';
import { Button } from './ui/button';
import { Clock, User } from 'lucide-react';


interface Article {
  id: string | number;
  slug: string;
  title: string;
  category: string | string[];
  readTime: string;
  author: string;
  excerpt: string;
}

const glowStyles = [
  'hover:shadow-[0_0_20px_2px_rgba(59,130,246,0.25)]',
  'hover:shadow-[0_0_20px_2px_rgba(34,197,94,0.25)]',
  'hover:shadow-[0_0_20px_2px_rgba(168,85,247,0.25)]',
];

const titleGlow = [
  'group-hover:text-blue-700 dark:group-hover:text-blue-400 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]',
  'group-hover:text-green-700 dark:group-hover:text-green-400 group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]',
  'group-hover:text-purple-700 dark:group-hover:text-purple-400 group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]',
];

function getRandomArticles<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const ArticleFeed = () => {
  const [randomArticles] = useState<Article[]>(() =>
    getRandomArticles(articles as unknown as Article[], 3)
  );
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4" id="discover">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-quantum to-molecule bg-clip-text text-transparent mb-6">
            Find Your Next Glimpse
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Every article takes about 5 minutes to read.
          </p>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {randomArticles.map((article, idx) => (
            <Link
              key={article.id}
              to={`/article/${article.slug}`}
              className={`group card-lift flex h-full flex-col gap-4 bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6 ${glowStyles[idx]}`}
            >
              <span className="self-start text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                {Array.isArray(article.category)
                  ? article.category.join(', ')
                  : article.category}
              </span>

              <h3 className={`text-xl font-semibold leading-snug text-foreground transition-colors duration-300 ${titleGlow[idx]}`}>
                {article.title}
              </h3>

              <p className="text-muted-foreground leading-relaxed">
                {article.excerpt}
              </p>

              <div className="mt-auto flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>{article.author}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{article.readTime}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Load more */}
        <div className="text-center mt-12">
          <Button
            size="lg"
            onClick={() => navigate('/articles')}
          >
            Explore More Articles
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ArticleFeed;
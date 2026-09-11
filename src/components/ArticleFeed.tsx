import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import articles from '../data/articles.json';
import { Button } from './ui/button';
import { Clock, User, ArrowRight } from 'lucide-react';


interface Article {
  id: string | number;
  slug: string;
  title: string;
  emoji: string;
  category: string | string[];
  readTime: string;
  author: string;
  excerpt: string;
  gradient: string;
}

const glowStyles = [
  'hover:shadow-[0_0_48px_12px_rgba(59,130,246,0.7)]',
  'hover:shadow-[0_0_48px_12px_rgba(34,197,94,0.7)]',
  'hover:shadow-[0_0_48px_12px_rgba(168,85,247,0.7)]',
];

const titleGlow = [
  'group-hover:text-blue-400 group-hover:drop-shadow-[0_0_18px_rgb(59,130,246)]',
  'group-hover:text-green-400 group-hover:drop-shadow-[0_0_18px_rgb(34,197,94)]',
  'group-hover:text-purple-400 group-hover:drop-shadow-[0_0_18px_rgb(168,85,247)]',
];

const buttonGlow = [
  'group-hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.5)]',
  'group-hover:shadow-[0_0_16px_4px_rgba(34,197,94,0.5)]',
  'group-hover:shadow-[0_0_16px_4px_rgba(168,85,247,0.5)]',
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
            Each article is crafted to take 5 minutes — Perfect for curious minds on the go.
          </p>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {randomArticles.map((article, idx) => (
            <Link
              key={article.id}
              to={`/article/${article.slug}`}
              className={`group block ${glowStyles[idx]}`}
            >
              <div className="card-glow h-full p-6 rounded-xl relative overflow-hidden">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${article.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}
                />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                      {Array.isArray(article.category)
                        ? article.category.join(', ')
                        : article.category}
                    </span>
                    <span className="text-3xl group-hover:animate-bounce hover:scale-110 transition-transform duration-300">
                      {article.emoji}
                    </span>
                  </div>

                  <h3 className={`text-xl font-bold transition-colors duration-300 text-slate-0 ${titleGlow[idx]}`}>
                    {article.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {article.excerpt}
                  </p>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{article.author}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{article.readTime}</span>
                    </div>
                  </div>

                  {/* Read Now Button */}
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`transition-shadow duration-300 ${buttonGlow[idx]} hover:text-black group/button`}
                    >
                      <span className="transition-colors duration-300 group-hover/button:text-black">
                        Read Now
                      </span>
                      <ArrowRight className="w-4 h-4 ml-2 transition-colors duration-300 group-hover/button:text-black group-hover/button:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Load more */}
        <div className="text-center mt-12">
          <Button
            variant="quantum"
            size="lg"
            className="px-8"
            onClick={() => navigate('/articles')}
          >
            Explore More Articles
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ArticleFeed;
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Clock, User, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Navigation from '@/components/Navigation';
import AnimatedBackground from '@/components/AnimatedBackground';

type Article = {
  id: number | string;
  slug: string;
  title: string;
  excerpt: string;
  category: string | string[];
  author?: string;
  readTime?: string;
  thumbnail?: string;
  [key: string]: any;
};

const subjectGlowMap: Record<string, string> = {
  Physics: 'rgba(138, 46, 225, 0.32)',
  Biology: 'rgba(20, 43, 28, 0.32)',
  Chemistry: 'rgba(169, 249, 22, 0.32)',
  Astronomy: 'rgba(59,130,246,0.32)',
  Medicine: 'rgba(21, 200, 232, 0.32)',
  Technology: 'rgba(233, 208, 14, 0.32)',
  Engineering: 'rgba(161, 206, 239, 0.32)',
  'Earth-science': 'rgba(212, 112, 18, 0.32)',
  Psychology: 'rgba(255, 19, 220, 0.32)',
  Math: 'rgba(234,179,8,0.32)',
  'Artificial Intelligence': 'rgba(77, 32, 213, 0.32)',
  'Data Science': 'rgba(45,212,191,0.32)',
  Junior: 'rgba(34, 197, 94, 0.32)',
  Debunked: 'rgba(99, 102, 241, 0.32)',
};

const ARTICLES_PER_PAGE = 9;
const PENDING_COUNT = 6;

const categoryNames: Record<string, string> = {
  'Earth-science': 'Earth Science',
  'Artificial Intelligence': 'Artificial Intelligence',
  'Data Science': 'Data Science',
};

const CATEGORIES = [
  { label: 'Physics', key: 'Physics', color: 'rgb(124,58,237)', lightColor: 'rgba(124,58,237,0.2)' },
  { label: 'Biology', key: 'Biology', color: 'rgb(45,212,191)', lightColor: 'rgba(45,212,191,0.2)' },
  { label: 'Chemistry', key: 'Chemistry', color: 'rgb(190,242,100)', lightColor: 'rgba(190,242,100,0.2)' },
  { label: 'Astronomy', key: 'Astronomy', color: 'rgb(59,130,246)', lightColor: 'rgba(59,130,246,0.2)' },
  { label: 'Medicine', key: 'Medicine', color: 'rgb(96,165,250)', lightColor: 'rgba(96,165,250,0.2)' },
  { label: 'Technology', key: 'Technology', color: 'rgb(250,204,21)', lightColor: 'rgba(250,204,21,0.2)' },
  { label: 'Earth Science', key: 'Earth Science', color: 'rgb(251,146,60)', lightColor: 'rgba(251,146,60,0.2)' },
  { label: 'Engineering', key: 'Engineering', color: 'rgb(156,163,175)', lightColor: 'rgba(156,163,175,0.2)' },
  { label: 'Psychology', key: 'Psychology', color: 'rgb(244,114,182)', lightColor: 'rgba(244,114,182,0.2)' },
  { label: 'Math', key: 'Math', color: 'rgb(239,68,68)', lightColor: 'rgba(239,68,68,0.2)' },
  { label: 'AI', key: 'Artificial Intelligence', color: 'rgb(140,80,200)', lightColor: 'rgba(140,80,200,0.2)' },
  { label: 'Data Science', key: 'Data Science', color: 'rgb(14,165,164)', lightColor: 'rgba(14,165,164,0.2)' },
  { label: 'Junior', key: 'Junior', color: 'rgb(234,88,12)', lightColor: 'rgba(234,88,12,0.2)' },
  { label: 'Creature Profile', key: 'Creature Profile', color: 'rgb(168,85,247)', lightColor: 'rgba(168,85,247,0.2)' },
  { label: 'Debunked', key: 'Debunked', color: 'rgb(34,197,94)', lightColor: 'rgba(34,197,94,0.2)' },
  { label: 'What If', key: 'What If', color: 'rgb(236,72,153)', lightColor: 'rgba(236,72,153,0.2)' },
  { label: 'How???', key: 'How???', color: 'rgb(20,184,166)', lightColor: 'rgba(20,184,166,0.2)' },
];

const Articles: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const categoryQuery = searchParams.get('category') || '';
  const authorQuery = searchParams.get('author') || '';
  const themeQuery = searchParams.get('theme') || '';
  const activeFilter = categoryQuery || themeQuery;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategories, setActiveCategories] = useState<string[]>(
    categoryQuery ? [categoryQuery] : []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [articlesLoaded, setArticlesLoaded] = useState(false);

  // Lazy load the articles JSON only after the page renders
  useEffect(() => {
    import('../data/articles.json').then((module) => {
      setAllArticles(module.default as Article[]);
      setArticlesLoaded(true);
    });
  }, []);

  // Memoized filtering so it doesn't recompute on every render
  const filteredArticles = useMemo(() => {
    return allArticles.filter((article) => {
      const articleCategories = Array.isArray(article.category)
        ? article.category
        : [article.category];

      const matchesCategory =
        activeCategories.length === 0 ||
        articleCategories.some((cat) =>
          activeCategories.some(
            (activeCategory) =>
              activeCategory.toLowerCase() === cat.toLowerCase()
          )
        );

      const matchesSearch =
        !searchTerm ||
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAuthor =
        !authorQuery ||
        (article.author &&
          article.author.toLowerCase() === authorQuery.toLowerCase());

      return matchesCategory && matchesSearch && matchesAuthor;
    });
  }, [allArticles, activeCategories, searchTerm, authorQuery]);

  // Reset to page 1 whenever filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeCategories, authorQuery]);

  const totalPages = Math.ceil(
    filteredArticles.length / ARTICLES_PER_PAGE
  );

  const paginatedArticles = filteredArticles.slice(
    (currentPage - 1) * ARTICLES_PER_PAGE,
    currentPage * ARTICLES_PER_PAGE
  );

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  )
    .filter(
      (page) =>
        page === 1 ||
        page === totalPages ||
        Math.abs(page - currentPage) <= 2
    )
    .reduce<(number | '...')[]>((accumulator, page, index, pages) => {
      if (
        index > 0 &&
        page - (pages[index - 1] as number) > 1
      ) {
        accumulator.push('...');
      }

      accumulator.push(page);
      return accumulator;
    }, []);

  const goToArticle = (slug: string) => {
    navigate(`/article/${slug}`);
  };

  const goToRandomArticle = () => {
    const pool =
      filteredArticles.length > 0
        ? filteredArticles
        : allArticles;

    if (pool.length === 0) return;

    const index = Math.floor(Math.random() * pool.length);
    goToArticle(pool[index].slug);
  };

  const toggleCategory = (key: string) => {
    setActiveCategories((previousCategories) =>
      previousCategories.some(
        (category) =>
          category.toLowerCase() === key.toLowerCase()
      )
        ? previousCategories.filter(
            (category) =>
              category.toLowerCase() !== key.toLowerCase()
          )
        : [...previousCategories, key]
    );
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AnimatedBackground />
      <Navigation />

      <main className="relative z-10 pt-20">
        {/* Header Row */}
        <div className="max-w-7xl mx-auto px-4 mb-10">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <button
                className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>

              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-quantum via-molecule to-neuron bg-clip-text text-transparent mt-6 mb-4">
                {activeFilter
                  ? `${categoryNames[activeFilter] || activeFilter} Articles`
                  : 'All Articles'}
              </h1>

              <p className="text-lg text-muted-foreground">
                Discover the latest insights and breakthroughs in science
              </p>
            </div>

            <div className="flex-shrink-0">
              <button
                onClick={goToRandomArticle}
                className="random-native-btn inline-flex items-center gap-2 px-6 py-3 rounded-md text-base font-semibold"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M3 12h7a4 4 0 0 1 0 8H3" />
                  <path d="M21 12h-7a4 4 0 0 0 0 8h7" />
                </svg>

                Random Article
              </button>
            </div>
          </div>
        </div>

        {/* Banner */}
        <div className="counts-banner-wrap w-full mb-12">
          <div className="counts-banner w-full">
            <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-center gap-10">
              <div className="flex items-center gap-10 flex-wrap">
                <div
                  className="inline-flex items-center rounded-full px-5 py-3 font-semibold text-base"
                  style={{
                    backgroundColor: 'hsl(268 67% 50% / 0.10)',
                    color: 'hsl(268 67% 50%)',
                  }}
                >
                  <span className="mr-4">
                    Number of Current Articles:
                  </span>

                  <span className="text-xl">
                    {filteredArticles.length}
                  </span>
                </div>

                {/*<div
                  className="inline-flex items-center rounded-full px-5 py-3 font-semibold text-base"
                  style={{ backgroundColor: 'hsl(150 60% 40% / 0.10)', color: 'hsl(150 60% 40%)' }}
                >
                  <span className="mr-4">Number of Pending Articles:</span>
                  <span className="text-xl">{PENDING_COUNT}</span>
                </div>*/}
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-7xl mx-auto px-4 mb-14">
          <div className="relative mx-auto w-full md:w-[860px]">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />

            <Input
              placeholder="Search for your next read..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              className="pl-14 py-4 w-full text-lg"
            />
          </div>
        </div>

        {/* Category Toggles */}
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <div className="flex items-center justify-center gap-3 flex-wrap px-2">
            {CATEGORIES.map((category) => {
              const isActive = activeCategories.some(
                (activeCategory) =>
                  activeCategory.toLowerCase() ===
                  category.key.toLowerCase()
              );

              return (
                <button
                  key={category.key}
                  onClick={() =>
                    toggleCategory(category.key)
                  }
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 border inline-block"
                  style={{
                    backgroundColor: isActive
                      ? category.lightColor
                      : 'transparent',
                    borderColor: isActive
                      ? category.color
                      : 'rgba(100,100,100,0.3)',
                    color: isActive
                      ? category.color
                      : 'inherit',
                  }}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="max-w-7xl mx-auto px-4 pb-20">
          {!articlesLoaded ? (
            <div className="flex items-center justify-center py-32 text-muted-foreground text-lg">
              Loading articles...
            </div>
          ) : paginatedArticles.length === 0 ? (
            <div className="flex items-center justify-center py-32 text-muted-foreground text-lg">
              No articles found.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {paginatedArticles.map((article) => {
                  const primarySubject = Array.isArray(
                    article.category
                  )
                    ? article.category[0]
                    : article.category;

                  const glow =
                    subjectGlowMap[primarySubject] ??
                    'rgba(59,130,246,0.28)';

                  return (
                    <Link
                      key={article.id}
                      to={`/article/${article.slug}`}
                      className="block"
                      aria-label={`Read ${article.title}`}
                    >
                      <article
                        className="group article-glow-card bg-card/60 backdrop-blur-sm border border-border rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer h-full"
                        style={{
                          ['--article-glow' as any]: glow,
                        }}
                      >
                        <div className="aspect-video bg-muted overflow-hidden">
                          <img
                            src={article.thumbnail}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        <div className="p-6 space-y-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Tag className="w-3 h-3" />

                            <span className="bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
                              {Array.isArray(article.category)
                                ? article.category.join(', ')
                                : article.category}
                            </span>

                            <Clock className="w-3 h-3 ml-2" />
                            <span>{article.readTime}</span>
                          </div>

                          <h2 className="text-xl font-semibold group-hover:text-primary transition-colors line-clamp-2">
                            {article.title}
                          </h2>

                          <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                            {article.excerpt}
                          </p>

                          <div className="flex items-center justify-between pt-4 border-t border-border">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-4 h-4" />
                              <span>{article.author}</span>
                            </div>

                            <span className="read-more-btn px-3 py-1 rounded-md border border-border text-sm font-medium">
                              Read More →
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-14">
                  <button
                    onClick={() =>
                      goToPage(currentPage - 1)
                    }
                    disabled={currentPage === 1}
                    className="p-2 rounded-md border border-border text-sm font-medium disabled:opacity-30 hover:border-primary/50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {pageNumbers.map((page, index) =>
                    page === '...' ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-muted-foreground"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() =>
                          goToPage(page as number)
                        }
                        className="w-9 h-9 rounded-md border text-sm font-medium transition-colors"
                        style={{
                          backgroundColor:
                            currentPage === page
                              ? 'hsl(268 67% 50% / 0.2)'
                              : 'transparent',
                          borderColor:
                            currentPage === page
                              ? 'hsl(268 67% 50%)'
                              : 'rgba(100,100,100,0.3)',
                          color:
                            currentPage === page
                              ? 'hsl(268 67% 50%)'
                              : 'inherit',
                        }}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    onClick={() =>
                      goToPage(currentPage + 1)
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md border border-border text-sm font-medium disabled:opacity-30 hover:border-primary/50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Page info */}
              <p className="text-center text-sm text-muted-foreground mt-4">
                Page {currentPage} of {totalPages} ·{' '}
                {filteredArticles.length} articles
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Articles;
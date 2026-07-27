import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AnimatedBackground from '@/components/AnimatedBackground';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import HotSights from '@/components/HotSights';
import ArticleFeed from '@/components/ArticleFeed';
import FoundersSection from '@/components/FoundersSection';
import WhatIsScienceGlimpse from '@/components/WhatIsScienceGlimpse';

type Category = {
  field: string;
  icon: string;
  tag: string;
  className: string;
};

const Index: React.FC = () => {
  const navigate = useNavigate();

  const goToCategory = (tag: string) => {
    navigate(`/articles?category=${encodeURIComponent(tag)}`);
  };

  const categories: Category[] = [
    { field: 'Physics', icon: '⚛️', tag: 'Physics', className: 'category-physics' },
    { field: 'Biology', icon: '🧬', tag: 'Biology', className: 'category-biology' },
    { field: 'Chemistry', icon: '🧪', tag: 'Chemistry', className: 'category-chemistry' },
    { field: 'Astronomy', icon: '🌌', tag: 'Astronomy', className: 'category-astronomy' },
    { field: 'Medicine', icon: '🩺', tag: 'Medicine', className: 'category-medicine' },
    { field: 'Technology', icon: '💻', tag: 'Technology', className: 'category-technology' },
    { field: 'Earth Science', icon: '🌍', tag: 'Earth Science', className: 'category-earth' },
    { field: 'Engineering', icon: '⚙️', tag: 'Engineering', className: 'category-engineering' },
    { field: 'Psychology', icon: '🧠', tag: 'Psychology', className: 'category-psychology' },
    { field: 'Math', icon: '🔢', tag: 'Math', className: 'category-math' },
    { field: 'Artificial Intelligence', icon: '🤖', tag: 'Artificial Intelligence', className: 'category-ai' },
    { field: 'Data Science', icon: '📊', tag: 'Data Science', className: 'category-data' },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AnimatedBackground />

      <Navigation />

      <main className="relative z-10">
        <HeroSection />

        <WhatIsScienceGlimpse
          centerText={true}
          paragraphSize="normal"
        />

        <HotSights />

        <section className="py-24 px-4 bg-muted/20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-neuron to-cosmic bg-clip-text text-transparent mb-4 py-[12px]">
              What's YOUR Obsession?
            </h2>

            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              Explore focused topics across physics, biology, chemistry,
              astronomy, medicine, technology and more — concise articles
              and guides to spark your curiosity.
            </p>

            <div className="grid grid-cols-5 grid-rows-3 gap-6 mb-8">
              {categories.map((item) => (
                <button
                  key={item.tag}
                  onClick={() => goToCategory(item.tag)}
                  className={`${item.className} aspect-square flex flex-col items-center justify-center bg-card/60 border border-border backdrop-blur-md rounded-2xl p-4 text-center transition-all duration-300 group`}
                  aria-label={item.field}
                >
                  <div className="text-4xl mb-2 group-hover:animate-bounce">
                    {item.icon}
                  </div>

                  <div className="text-sm font-semibold text-foreground bg-gray-500 rounded-full px-4 py-1">
                    {item.field}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <ArticleFeed />

        {/* <FoundersSection /> */}

        <footer className="py-16 px-4 border-t border-border bg-card/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-muted-foreground">
              © 2025 ScienceGlimpse. Made with curiosity by students,
              for everyone.
            </p>

            <div className="mt-4 flex justify-center space-x-6 text-sm text-muted-foreground">
              <Link
                to="/about"
                className="hover:text-primary transition-colors"
              >
                About
              </Link>

              <Link
                to="/submission"
                className="hover:text-primary transition-colors"
              >
                Apply to Write
              </Link>

              <Link
                to="/contact"
                className="hover:text-primary transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
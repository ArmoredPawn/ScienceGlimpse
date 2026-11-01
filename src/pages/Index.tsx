import React from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import HotSights from '@/components/HotSights';
import ArticleFeed from '@/components/ArticleFeed';
import FoundersSection from '@/components/FoundersSection';
import WhatIsScienceGlimpse from '@/components/WhatIsScienceGlimpse';
import GameSection from '@/components/GameSection';

type Category = {
  field: string;
  icon: string;
  tag: string;
  glow: string;
};

const Index: React.FC = () => {
  const navigate = useNavigate();

  const goToCategory = (tag: string) => {
    navigate(`/articles?category=${encodeURIComponent(tag)}`);
  };

  const categories: Category[] = [
    { field: 'Physics', icon: '⚛️', tag: 'Physics', glow: '124 58 237' },
    { field: 'Biology', icon: '🧬', tag: 'Biology', glow: '45 212 191' },
    { field: 'Chemistry', icon: '🧪', tag: 'Chemistry', glow: '190 242 100' },
    { field: 'Astronomy', icon: '🌌', tag: 'Astronomy', glow: '59 130 246' },
    { field: 'Medicine', icon: '🩺', tag: 'Medicine', glow: '96 165 250' },
    { field: 'Technology', icon: '💻', tag: 'Technology', glow: '250 204 21' },
    { field: 'Earth Science', icon: '🌍', tag: 'Earth Science', glow: '251 146 60' },
    { field: 'Engineering', icon: '⚙️', tag: 'Engineering', glow: '156 163 175' },
    { field: 'Psychology', icon: '🧠', tag: 'Psychology', glow: '244 114 182' },
    { field: 'Math', icon: '🔢', tag: 'Math', glow: '239 68 68' },
    { field: 'Artificial Intelligence', icon: '🤖', tag: 'Artificial Intelligence', glow: '140 80 200' },
    { field: 'Data Science', icon: '📊', tag: 'Data Science', glow: '14 165 164' },
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

        <GameSection />

        <HotSights />

        <section className="py-24 px-6 bg-muted/20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-center text-4xl md:text-5xl font-bold bg-gradient-to-r from-neuron to-cosmic bg-clip-text text-transparent mb-4 py-[12px]">
              What's YOUR Obsession?
            </h2>

            <p className="text-center text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Pick a field to see every article we've published on it.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map((item) => (
                <button
                  key={item.tag}
                  onClick={() => goToCategory(item.tag)}
                  style={{ '--tile-glow': item.glow } as React.CSSProperties}
                  className="category-tile group flex items-center gap-3 bg-card/60 backdrop-blur-md border border-border rounded-lg px-4 py-4 text-left font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-2xl leading-none shrink-0 group-hover:animate-bounce" aria-hidden="true">{item.icon}</span>
                  {item.field}
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
              © {new Date().getFullYear()} ScienceGlimpse. Made with curiosity by students,
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
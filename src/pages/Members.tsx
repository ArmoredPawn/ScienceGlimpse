import React, { useEffect } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import FoundersSection from '@/components/FoundersSection';

const Members: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AnimatedBackground />
      <Navigation />

      <main className="relative z-10 pt-20">
        <div className="pt-6">
          <FoundersSection />
        </div>

        <footer className="py-16 px-4 border-t border-border bg-card/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-muted-foreground">
              © {new Date().getFullYear()} ScienceGlimpse. Made with curiosity by students, for students.
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

export default Members;
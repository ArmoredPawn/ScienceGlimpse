import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown } from 'lucide-react';
import { Button } from './ui/button';
import './HeroSection.css';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-24">
      <div className="max-w-6xl mx-auto text-center space-y-8">
        {/* Main Brand */}
        <div className="space-y-6">
          <h1 className="text-[clamp(2.75rem,11vw,6rem)] font-bold flowing-gradient-text leading-tight">
            ScienceGlimpse
          </h1>

          <h2 className="text-2xl md:text-4xl text-foreground/90 leading-tight font-extralight">
            A 5-Minute Glimpse Into the
            <span className="block">Universe of Science</span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-bold">
            From black holes to brainwaves — science, decoded and reimagined
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-8 flex justify-center w-full max-w-2xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            <Button
              size="lg"
              onClick={() => navigate('/submission')}
              className="glow-action-btn-purple bg-blue-700 hover:bg-purple-700 text-white text-lg"
            >
              Submit Your Article
            </Button>

            <Button
              size="lg"
              onClick={() => navigate('/classes')}
              className="glow-action-btn-green bg-green-700 hover:bg-green-800 text-white text-lg"
            >
              Classes
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="pt-12 animate-bounce">
          <ArrowDown className="w-6 h-6 text-muted-foreground mx-auto" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

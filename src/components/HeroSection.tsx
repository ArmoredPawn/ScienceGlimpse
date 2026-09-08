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
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold flowing-gradient-text bg-clip-text text-transparent leading-tight">
            ScienceGlimpse
          </h1>

          <h2 className="text-2xl md:text-4xl text-foreground/90 leading-tight font-extralight lg:text-4xl">
            A 5-Minute Glimpse Into the
            <span className="block">Universe of Science</span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed md:text-xl font-bold">
            From black holes to brainwaves — science, decoded and reimagined
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-8 flex justify-center w-full max-w-2xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            <Button
              variant="default"
              size="lg"
              onClick={() => navigate('/submission')}
              className="glow-action-btn-purple bg-blue-700 hover:bg-purple-700 text-white text-lg py-4 transition-all duration-300 border border-black"
            >
              Submit Your Article →
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/classes')}
              className="glow-action-btn-green bg-green-700 text-lg py-4 transition-all duration-300"
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
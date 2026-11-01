import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Fixed once at load so the stars don't jump every time the scene changes.
const stars = Array.from({ length: 20 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 5}s`,
  animationDuration: `${4 + Math.random() * 4}s`,
}));

const AnimatedBackground = () => {
  const [currentTheme, setCurrentTheme] = useState(0);
  
  const themes = [
    'atom', 'neural', 'cosmic', 'molecular', 'cellular'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTheme(prev => (prev + 1) % themes.length);
    }, 15000); // Change every 15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />
      
      {/* Atom Animation */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-3000",
        currentTheme === 0 ? "opacity-100" : "opacity-0"
      )}>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {/* Nucleus */}
          <div className="relative w-8 h-8 bg-quantum rounded-full animate-pulse-glow">
            {/* Electron orbits */}
            <div className="absolute inset-0 animate-rotate-slow">
              <div className="absolute w-32 h-32 border border-quantum/30 rounded-full -top-12 -left-12" />
              <div className="absolute w-3 h-3 bg-quantum rounded-full -top-1.5 left-14 animate-orbit" />
            </div>
            <div className="absolute inset-0 animate-rotate-slow" style={{ animationDirection: 'reverse', animationDuration: '12s' }}>
              <div className="absolute w-48 h-24 border border-molecule/20 rounded-full -top-6 -left-20 rotate-45" />
              <div className="absolute w-2 h-2 bg-molecule rounded-full top-6 -left-2 animate-orbit" />
            </div>
          </div>
        </div>
      </div>

      {/* Neural Network Animation */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-3000",
        currentTheme === 1 ? "opacity-100" : "opacity-0"
      )}>
        {/* Neural nodes */}
        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-neuron rounded-full animate-neural-pulse" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-neuron rounded-full animate-neural-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-5 h-5 bg-neuron rounded-full animate-neural-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 right-1/3 w-3 h-3 bg-neuron rounded-full animate-neural-pulse" style={{ animationDelay: '1.5s' }} />
        
        {/* Connections */}
        <svg className="absolute inset-0 w-full h-full">
          <line x1="25%" y1="25%" x2="75%" y2="33%" stroke="hsl(var(--neuron-green))" strokeWidth="1" opacity="0.3" className="animate-pulse" />
          <line x1="33%" y1="66%" x2="66%" y2="75%" stroke="hsl(var(--neuron-green))" strokeWidth="1" opacity="0.3" className="animate-pulse" style={{ animationDelay: '0.8s' }} />
        </svg>
      </div>

      {/* Cosmic/Black hole Animation */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-3000",
        currentTheme === 2 ? "opacity-100" : "opacity-0"
      )}>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            {/* Accretion disk rings */}
            <div className="absolute inset-0 animate-rotate-slow">
              <div className="w-40 h-40 border-2 border-cosmic/20 rounded-full" />
            </div>
            <div className="absolute inset-0 animate-rotate-slow" style={{ animationDuration: '15s' }}>
              <div className="w-32 h-32 border border-primary/30 rounded-full translate-x-4 translate-y-4" />
            </div>
            <div className="absolute inset-0 animate-rotate-slow" style={{ animationDuration: '25s' }}>
              <div className="w-24 h-24 border border-quantum/40 rounded-full translate-x-8 translate-y-8" />
            </div>
            {/* Event horizon */}
            <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-primary/50" />
          </div>
        </div>
      </div>

      {/* Molecular Animation */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-3000",
        currentTheme === 3 ? "opacity-100" : "opacity-0"
      )}>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {/* Molecule structure */}
          <div className="relative animate-float">
            <div className="w-6 h-6 bg-molecule rounded-full" />
            <div className="absolute w-5 h-5 bg-secondary rounded-full top-8 left-4" />
            <div className="absolute w-4 h-4 bg-quantum rounded-full -top-6 left-8" />
            <div className="absolute w-5 h-5 bg-neuron rounded-full top-4 -left-8" />
            
            {/* Bonds */}
            <div className="absolute w-px h-8 bg-foreground/20 top-6 left-3 rotate-45" />
            <div className="absolute w-8 h-px bg-foreground/20 top-3 left-6" />
            <div className="absolute w-px h-6 bg-foreground/20 -top-3 left-3 -rotate-45" />
          </div>
        </div>
      </div>

      {/* Cellular Animation */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-3000",
        currentTheme === 4 ? "opacity-100" : "opacity-0"
      )}>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {/* Cell membrane */}
          <div className="relative w-48 h-32 border-2 border-accent/30 rounded-full animate-float">
            {/* Nucleus */}
            <div className="absolute top-1/2 left-1/2 w-12 h-8 bg-primary/40 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
            
            {/* Mitochondria */}
            <div className="absolute top-6 left-8 w-6 h-3 bg-neuron/60 rounded-full animate-pulse-glow" />
            <div className="absolute bottom-8 right-12 w-5 h-4 bg-neuron/60 rounded-full animate-pulse-glow" style={{ animationDelay: '1s' }} />
            
            {/* Organelles */}
            <div className="absolute top-4 right-8 w-3 h-3 bg-molecule/50 rounded-full" />
            <div className="absolute bottom-6 left-12 w-4 h-4 bg-quantum/40 rounded-full" />
          </div>
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {stars.map((style, i) => (
          <div key={i} className="absolute w-1 h-1 bg-primary/20 rounded-full animate-float" style={style} />
        ))}
      </div>
    </div>
  );
};

export default AnimatedBackground;
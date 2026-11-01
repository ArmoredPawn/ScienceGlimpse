import React, { useEffect } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
const Donate = () => {
  useEffect(() => {
      window.scrollTo(0, 0);
  }, []);
  return <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AnimatedBackground />
      <Navigation />
      
      <main className="relative z-10 pt-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Support Our Mission
          </h1>
          
          {/* Donation amount buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <Button size="lg" className="h-16 min-w-28 text-2xl font-semibold">
              $5
            </Button>
            <Button size="lg" className="h-16 min-w-28 text-2xl font-semibold">
              $10
            </Button>
            <Button size="lg" className="h-16 min-w-28 text-2xl font-semibold">
              $25
            </Button>
          </div>
          
          {/* Cause explanation */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6">Making Science Accessible for All</h2>
            <div className="text-left space-y-4 text-muted-foreground">
              <p>
                Your donation directly impacts students in underfunded schools who lack access to quality science education and learning materials. Many schools struggle to provide:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Up-to-date science textbooks and digital resources</li>
                <li>Laboratory equipment for hands-on experiments</li>
                <li>Access to current scientific research and discoveries</li>
                <li>Engaging educational content that sparks curiosity</li>
              </ul>
              <p>
                With your support, we can bridge this gap by creating free, accessible science content and providing educational resources to schools that need them most. Every dollar helps us reach more students and inspire the next generation of scientists, researchers, and innovators.
              </p>
              <p className="font-semibold text-foreground">
                Together, we can ensure that every student has the opportunity to discover the wonder of science, regardless of their school's funding.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>;
};
export default Donate;
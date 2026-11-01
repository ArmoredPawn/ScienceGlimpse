import React, { useState, useEffect } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import WhatIsScienceGlimpse from '@/components/WhatIsScienceGlimpse';

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AnimatedBackground />
      <Navigation />

      <main className="relative z-10 pt-20">
        <WhatIsScienceGlimpse
          showVideo={false}
          showButton={false}
          centerText={true}
          paragraphSize="lg"
          overrideParagraphs={[
            `ScienceGlimpse is a student-led exploration site dedicated to making science accessible, engaging, and meaningful for students and science enthusiasts everywhere. We partner with passionate student writers who conduct independent research and translate complex scientific concepts into clear, compelling 5-minute articles that highlight core ideas, real-world applications, and breakthrough discoveries. Unlike traditional science writing, we focus on clarity and engagement, ensuring every reader—regardless of background—can understand and appreciate the science behind today's most exciting innovations. Our mission extends beyond content creation to fostering the next generation of science communicators and researchers.`,
            `We specifically seek middle and high school student authors who are deeply interested in STEM and eager to develop their science communication skills. Through ScienceGlimpse, young writers gain hands-on experience in independent research, developing persuasive scientific arguments, and reaching a global audience. We provide comprehensive editorial support, publication opportunities, and mentorship to help students build portfolios and confidence in their abilities. By empowering youth to share their unique perspectives, we're not just publishing articles—we're cultivating future leaders, innovators, and science communicators who will shape our understanding of the world.`
          ]}
        />

        {/* Our Mission */}
        <section className="py-16 px-4 bg-muted/20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-neuron to-cosmic bg-clip-text text-transparent mb-8 text-center">
              Our Mission
            </h2>

            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-8">
              {/* <p className="text-xl text-foreground leading-relaxed">
                Our mission is to educate and inspire by making science accessible, engaging, and relevant to everyday life. We explore a wide range of scientific topics to spark curiosity and empower the next generation of thinkers, innovators, and world-changers. Through creative storytelling and interactive learning, we believe that understanding how the world around us works is key to shaping a better future—for everyone.</p> */}

              <p className="text-xl text-foreground leading-relaxed">
                Our mission is to educate and inspire by making science{' '}
                accessible,{' '}
                engaging, and{' '}
                relevant to everyday life.
                We explore a wide range of scientific topics to spark curiosity
                and empower the next generation{' '}
                of thinkers, innovators, and world-changers.
                <br />
                <br />
                Through{' '}
                creative storytelling and interactive learning, we believe that understanding how the world around us works is
                key to{' '}
                shaping a better future for
                everyone.
              </p>
            </div>
          </div>
        </section>

        {/* Our Impact
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-molecule to-neuron bg-clip-text text-transparent mb-12 text-center">
              Our Impact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-8 text-center card-glow">
                <div className="text-4xl md:text-5xl font-bold text-quantum mb-4">
                  150+
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Articles Published</h3>
                <p className="text-muted-foreground">
                  Comprehensive science articles covering cutting-edge research across multiple disciplines.
                </p>
              </div>
              
              <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-8 text-center card-glow">
                <div className="text-4xl md:text-5xl font-bold text-neuron mb-4">
                  25+
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Student Authors</h3>
                <p className="text-muted-foreground">
                  Passionate student researchers and science communicators from around the world.
                </p>
              </div>
              
              <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-8 text-center card-glow">
                <div className="text-4xl md:text-5xl font-bold text-cosmic mb-4">
                  50+
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Schools Reached</h3>
                <p className="text-muted-foreground">
                  Educational institutions worldwide using our content to inspire the next generation.
                </p>
              </div>
            </div>
          </div>
        </section> */}

        {/* Footer */}
        <footer className="py-16 px-4 border-t border-border bg-card/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-muted-foreground">
              © {new Date().getFullYear()} ScienceGlimpse. Made with curiosity by students, for
              students.
            </p>

            <div className="mt-4 flex justify-center space-x-6 text-sm text-muted-foreground">

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

export default About;
import React, { useEffect } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';

const JUNIOR_WRITER_SIGNUP_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScr_7sDDWJWgjd-AO2syVNu8GT3Wk4gp2XA_DLl9C0jbdZ6gA/viewform';

const MENTOR_SIGNUP_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfEM473gP7ATKSIXB9VnA1F5_AKuaWkh6W_EZ6nxua3f-KcwA/viewform';

const Classes = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AnimatedBackground />
      <Navigation />

      <main className="relative z-10 pt-24">
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-neuron to-cosmic bg-clip-text text-transparent mb-4 py-[12px]">
                ScienceGlimpse Junior Writers Program
              </h1>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A free, student-run science education program.
              </p>
            </div>

            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-8 space-y-4 text-foreground/90">
              <p>
                ScienceGlimpse is offering a free, student-run science
                education program where <b>middle schoolers</b> learn to{' '}
                <b>research</b> and <b>write</b> short, fun science articles.
              </p>

              <p>
                Each student is paired with a <b>high school mentor</b> for
                weekly one-hour sessions (online via Google Meet), learning{' '}
                <b>fun</b> and <b>comprehensive skills</b> like finding a
                topic, researching, and writing.
              </p>

              <p>
                Completed articles are <b>published</b> on our website, and
                writers earn a <b>"Junior Science Writer" certificate</b> for
                their work.
              </p>

              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="font-semibold text-foreground">
                  First Junior Writers Session
                </p>

                <p className="mt-1 font-medium">
                  September 22, 2026 &middot; 4:00–5:00 PM EST
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Button asChild variant="neuron" size="lg" className="flex-1">
                <a
                  href={JUNIOR_WRITER_SIGNUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sign Up as a Junior Writer
                </a>
              </Button>

              <Button asChild variant="cosmic" size="lg" className="flex-1">
                <a
                  href={MENTOR_SIGNUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sign Up as a Mentor
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Classes;

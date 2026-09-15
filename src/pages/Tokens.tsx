import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Coins,
  PenLine,
  Mountain,
  UserPlus,
} from 'lucide-react';

import AnimatedBackground from '@/components/AnimatedBackground';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { JUMPS_PER_TOKEN, TOKENS_PER_CHARGE } from '@/lib/tokens';
import { SIGNUP_BONUS_TOKENS } from '@/context/AuthContext';

const ARTICLE_READ_REWARD = 10;
const ARTICLE_SUBMISSION_REWARD = 50;

const Tokens = () => {
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
              <div className="flex items-center justify-center mb-4">
                <Coins className="h-12 w-12 text-primary" />
              </div>

              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-neuron to-cosmic bg-clip-text text-transparent mb-4 py-[12px]">
                ScienceGlimpse Tokens
              </h1>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Tokens are what you earn for being part of ScienceGlimpse —
                reading science, and writing it. They are how you power your
                climb in Science Summit.
              </p>
            </div>

            {/* Earning */}
            <h2 className="text-2xl font-bold text-foreground mb-4">
              How to earn tokens
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
              <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <UserPlus className="h-6 w-6 text-primary" />

                  <span className="text-2xl font-bold text-primary">
                    +{SIGNUP_BONUS_TOKENS}
                  </span>
                </div>

                <p className="font-semibold text-foreground">
                  Create an account
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Every new ScienceGlimpse account starts with{' '}
                  {SIGNUP_BONUS_TOKENS} tokens, so you can go straight to
                  Science Summit before you have read anything.
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  This is a one-off welcome balance — it lands once, when
                  your account is created.
                </p>
              </div>

              <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <BookOpen className="h-6 w-6 text-primary" />

                  <span className="text-2xl font-bold text-primary">
                    +{ARTICLE_READ_REWARD}
                  </span>
                </div>

                <p className="font-semibold text-foreground">
                  Read an article
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Every article you read earns {ARTICLE_READ_REWARD} tokens.
                  You need to be logged in, and you need to actually read it —
                  the timer counts four minutes of real reading and pauses when
                  you switch tabs or stop interacting with the page.
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Each article rewards you once, so the more articles you read,
                  the more you earn.
                </p>
              </div>

              <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <PenLine className="h-6 w-6 text-primary" />

                    <span className="text-2xl font-bold text-primary">
                      +{ARTICLE_SUBMISSION_REWARD}
                    </span>
                  </div>

                  <span className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                    Coming soon
                  </span>
                </div>

                <p className="font-semibold text-foreground">
                  Submit an article
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Writing for ScienceGlimpse will earn you{' '}
                  {ARTICLE_SUBMISSION_REWARD} tokens for every article{' '}
                  <b className="text-foreground">
                    accepted for publication
                  </b>{' '}
                  — five times what reading one pays, because writing one is a
                  lot more work.
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Tokens are awarded when an article is accepted, not for
                  submitting one. Put your ScienceGlimpse username on the
                  submission form so they reach the right account.
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  This reward is not switched on yet — we will announce it
                  here once it is.
                </p>
              </div>
            </div>

            {/* Spending */}
            <h2 className="text-2xl font-bold text-foreground mb-4">
              How to spend tokens
            </h2>

            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-6 mb-10">
              <div className="flex items-center gap-3 mb-3">
                <Mountain className="h-6 w-6 text-primary" />

                <p className="font-semibold text-foreground">
                  Science Summit
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                Jumping costs tokens. Every {JUMPS_PER_TOKEN} jumps spends{' '}
                {TOKENS_PER_CHARGE}{' '}
                {TOKENS_PER_CHARGE === 1 ? 'token' : 'tokens'}, so a longer
                climb costs more than a short one. Reading funds playing — run
                out of tokens and you will need to go read something to keep
                climbing.
              </p>
            </div>

            {/* Balance */}
            <div className="rounded-xl border border-border bg-muted/40 p-6">
              <p className="font-semibold text-foreground">
                Where to see your balance
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                Your token balance lives on your{' '}
                <Link
                  to="/profile"
                  className="font-medium text-primary hover:underline"
                >
                  profile
                </Link>
                , along with everything you have earned and spent. Tokens are
                tied to your account, so sign in before you start reading if
                you want them to count.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Button asChild variant="neuron" size="lg" className="flex-1">
                <Link to="/articles">Start Reading</Link>
              </Button>

              <Button asChild variant="cosmic" size="lg" className="flex-1">
                <Link to="/science-summit">Play Science Summit</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Tokens;

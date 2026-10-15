import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Gamepad2, Play, Trophy } from 'lucide-react';

import AnimatedBackground from '@/components/AnimatedBackground';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import summitScreenshot from '@/assets/science-summit-gameplay.png';

interface ArcadeGame {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  playPath: string;
  leaderboardPath: string;
}

// Add a new game here and it gets its own card on the page.
const GAMES: ArcadeGame[] = [
  {
    title: 'ScienceGlimpse Summit',
    description:
      'Climb as high as you can while lava rises steadily from below. ' +
      'Jump across floating platforms, powered by the real ScienceGlimpse ' +
      'tokens you earn by reading and publishing articles.',
    image: summitScreenshot,
    imageAlt:
      'Gameplay screenshot of ScienceGlimpse Summit, a vertical platformer',
    playPath: '/science-summit',
    leaderboardPath: '/leaderboard',
  },
];

const Arcade = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loginPromptGame, setLoginPromptGame] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePlayClick = (game: ArcadeGame) => {
    if (user) {
      navigate(game.playPath);
      return;
    }

    setLoginPromptGame(game.title);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AnimatedBackground />
      <Navigation />

      <main className="relative z-10 pt-24">
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-4">
                <Gamepad2 className="h-12 w-12 text-primary" />
              </div>

              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-neuron to-cosmic bg-clip-text text-transparent mb-4 py-[12px]">
                ScienceGlimpse Arcade
              </h1>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Science games powered by the tokens you earn on
                ScienceGlimpse. Pick a game and see how you rank.
              </p>

              <Button
                variant="outline"
                size="lg"
                className="mt-6"
                onClick={() => navigate('/tokens')}
              >
                <Coins className="h-4 w-4" />
                How Tokens Work
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              {GAMES.map((game) => (
                <article
                  key={game.title}
                  className="flex flex-col w-full sm:w-[22rem] bg-card/60 backdrop-blur-sm border border-border rounded-xl overflow-hidden"
                >
                  <img
                    src={game.image}
                    alt={game.imageAlt}
                    className="w-full aspect-video object-cover"
                  />

                  <div className="flex flex-col flex-1 p-6">
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {game.title}
                    </h2>

                    <p className="text-sm text-muted-foreground flex-1">
                      {game.description}
                    </p>

                    <div className="flex flex-col gap-3 mt-6">
                      <Button
                        variant="neuron"
                        size="lg"
                        onClick={() => handlePlayClick(game)}
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Play
                      </Button>

                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => navigate(game.leaderboardPath)}
                      >
                        <Trophy className="h-4 w-4" />
                        Leaderboard
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Dialog
        open={loginPromptGame !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLoginPromptGame(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign In to Play</DialogTitle>

            <DialogDescription>
              {loginPromptGame} is only available to signed-in
              ScienceGlimpse members. Your real tokens power the game, and
              your best score goes on the leaderboard.
            </DialogDescription>
          </DialogHeader>

          <Button
            variant="neuron"
            className="w-full"
            onClick={() => {
              setLoginPromptGame(null);
              navigate('/login');
            }}
          >
            Log In
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Arcade;

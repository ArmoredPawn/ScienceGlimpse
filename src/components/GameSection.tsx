import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Trophy } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { useAuth } from '@/context/AuthContext';
import gameScreenshot from '@/assets/science-summit-gameplay.png';

const GameSection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handlePlayClick = () => {
    if (user) {
      navigate('/science-summit');
      return;
    }

    setShowLoginPrompt(true);
  };

  return (
    <section className="relative py-20 md:py-24 overflow-hidden text-gray-100">
      {/* Transparent backdrop (lets animated background show through) */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-12 px-6">
        <div className="flex-1 flex justify-center">
          <button
            type="button"
            onClick={handlePlayClick}
            aria-label="Play Science Summit"
            className="group relative w-full max-w-md rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(147,51,234,0.5)] border-4 border-purple-500/70"
          >
            <img
              src={gameScreenshot}
              alt="Gameplay screenshot of Science Summit, a vertical platformer"
              className="w-full h-auto block transition-transform duration-300 group-hover:scale-105"
            />

            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center gap-2 rounded-full bg-white/90 px-5 py-3 text-sm font-semibold text-black">
                <Play className="h-4 w-4 fill-current" />
                Play Now
              </div>
            </div>
          </button>
        </div>

        <div className="flex-1 text-left">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            PLAY{' '}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]">
              SCIENCEGLIMPSE SUMMIT
            </span>
          </h2>

          <p className="text-lg leading-relaxed text-gray-200 mt-6">
            Climb as high as you can in <b>Science Summit</b>, an original
            vertical platformer built by ScienceGlimpse. Jump across
            floating platforms while lava rises steadily from below —
            and power your climb with your real ScienceGlimpse tokens,
            earned by reading articles on the site.
          </p>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 mt-12">
            <Button
              variant="outline"
              size="lg"
              className="glow-action-btn-green text-black dark:text-white text-lg py-4 transition-all duration-300"
              onClick={handlePlayClick}
            >
              Play Now
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="text-lg py-4 transition-all duration-300"
              onClick={() => navigate('/leaderboard')}
            >
              Leaderboard
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="text-lg py-4 transition-all duration-300"
              onClick={() => navigate('/tokens')}
            >
              How Tokens Work
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-transparent animate-pulse pointer-events-none" />

      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign In to Play</DialogTitle>

            <DialogDescription>
              Science Summit is only available to signed-in
              ScienceGlimpse members — your real tokens power the
              climb, and your best altitude goes on the leaderboard.
            </DialogDescription>
          </DialogHeader>

          <Button
            variant="neuron"
            className="w-full"
            onClick={() => {
              setShowLoginPrompt(false);
              navigate('/login');
            }}
          >
            Log In
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default GameSection;

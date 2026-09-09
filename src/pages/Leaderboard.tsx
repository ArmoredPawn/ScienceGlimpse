import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { Trophy, Mountain } from 'lucide-react';

import AnimatedBackground from '@/components/AnimatedBackground';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';

interface LeaderboardEntry {
  uid: string;
  username: string;
  bestAltitude: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLeaderboard = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const leaderboardQuery = query(
          collection(db, 'leaderboard'),
          orderBy('bestAltitude', 'desc'),
          limit(50)
        );

        const snapshot = await getDocs(leaderboardQuery);

        if (cancelled) {
          return;
        }

        const results = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();

          return {
            uid: docSnapshot.id,
            username:
              typeof data.username === 'string'
                ? data.username
                : 'Unknown climber',
            bestAltitude:
              typeof data.bestAltitude === 'number'
                ? data.bestAltitude
                : 0,
          };
        });

        setEntries(results);
      } catch (error) {
        console.error('Could not load the leaderboard:', error);

        if (!cancelled) {
          setErrorMessage('Could not load the leaderboard right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AnimatedBackground />
      <Navigation />

      <main className="relative z-10 pt-24">
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-4">

                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-neuron to-cosmic bg-clip-text text-transparent py-[6px]">
                  Science Summit Leaderboard
                </h1>
              </div>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The highest climbers in ScienceGlimpse Summit, ranked by
                best altitude reached.
              </p>
            </div>

            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl overflow-hidden">
              {loading ? (
                <p className="p-8 text-center text-muted-foreground">
                  Loading leaderboard...
                </p>
              ) : errorMessage ? (
                <p
                  role="alert"
                  className="p-8 text-center text-destructive"
                >
                  {errorMessage}
                </p>
              ) : entries.length === 0 ? (
                <div className="p-10 text-center">
                  <Mountain className="w-10 h-10 mx-auto text-muted-foreground mb-3" />

                  <p className="text-muted-foreground">
                    No climbs recorded yet — be the first on the board!
                  </p>
                </div>
              ) : (
                <ul>
                  {entries.map((entry, index) => (
                    <li
                      key={entry.uid}
                      className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border last:border-b-0"
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-8 text-center font-bold text-lg text-muted-foreground">
                          {MEDALS[index] ?? `#${index + 1}`}
                        </span>

                        <span className="font-medium text-foreground">
                          @{entry.username}
                        </span>
                      </div>

                      <span className="font-semibold text-primary">
                        {entry.bestAltitude.toLocaleString()} m
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="text-center mt-10">
              <Button asChild variant="neuron" size="lg">
                <Link to="/game">Play Science Summit</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Leaderboard;

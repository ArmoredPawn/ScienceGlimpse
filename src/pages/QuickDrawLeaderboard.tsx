import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { Zap } from 'lucide-react';

import AnimatedBackground from '@/components/AnimatedBackground';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  DRAWS_PER_DUEL,
  QUICK_DRAW_LEADERBOARD,
  quickDrawTier,
} from '@/lib/quickDraw';

interface LadderEntry {
  uid: string;
  username: string;
  bestTime: number;
  /** Tied times share a rank. */
  rank: number;
}

interface OwnStanding {
  bestTime: number;
  rank: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const LADDER_LIMIT = 50;

const QuickDrawLeaderboard = () => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [entries, setEntries] = useState<LadderEntry[]>([]);
  const [ownStanding, setOwnStanding] = useState<OwnStanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLadder = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const ladder = collection(db, QUICK_DRAW_LEADERBOARD);

        const snapshot = await getDocs(
          query(ladder, orderBy('bestTime', 'asc'), limit(LADDER_LIMIT))
        );

        if (cancelled) {
          return;
        }

        const results: LadderEntry[] = [];

        snapshot.docs.forEach((docSnapshot, index) => {
          const data = docSnapshot.data();

          const bestTime =
            typeof data.bestTime === 'number' ? data.bestTime : 0;

          const previous = results[results.length - 1];

          results.push({
            uid: docSnapshot.id,
            username:
              typeof data.username === 'string'
                ? data.username
                : 'Unknown player',
            bestTime,
            rank:
              previous && previous.bestTime === bestTime
                ? previous.rank
                : index + 1,
          });
        });

        setEntries(results);

        /*
         * A signed-in player outside the top 50 still sees where they
         * stand, under the list.
         */
        if (userId && !results.some((entry) => entry.uid === userId)) {
          const ownSnapshot = await getDoc(
            doc(db, QUICK_DRAW_LEADERBOARD, userId)
          );

          const ownTime = ownSnapshot.exists()
            ? ownSnapshot.data().bestTime
            : null;

          if (typeof ownTime === 'number') {
            const fasterSnapshot = await getCountFromServer(
              query(ladder, where('bestTime', '<', ownTime))
            );

            if (!cancelled) {
              setOwnStanding({
                bestTime: ownTime,
                rank: fasterSnapshot.data().count + 1,
              });
            }
          }
        }
      } catch (error) {
        console.error('Could not load the Quick Draw ladder:', error);

        if (!cancelled) {
          setErrorMessage('Could not load the ladder right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    setOwnStanding(null);
    void loadLadder();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AnimatedBackground />
      <Navigation />

      <main className="relative z-10 pt-24">
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-neuron to-cosmic bg-clip-text text-transparent mb-4 py-[6px]">
                ScienceGlimpse Quick Draw Ladder Leaderboard
              </h1>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The fastest reflexes on ScienceGlimpse, ranked by best
                average reaction time over a {DRAWS_PER_DUEL}-draw duel.
                Lower is faster.
              </p>
            </div>

            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl overflow-hidden">
              {loading ? (
                <p className="p-8 text-center text-muted-foreground">
                  Loading the ladder...
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
                  <Zap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />

                  <p className="text-muted-foreground">
                    Nobody's on the ladder yet — be the first!
                  </p>
                </div>
              ) : (
                <ul>
                  {entries.map((entry) => {
                    const isYou = entry.uid === userId;
                    const tier = quickDrawTier(entry.bestTime);

                    return (
                      <li
                        key={entry.uid}
                        className={`flex items-center justify-between gap-4 px-6 py-4 border-b border-border last:border-b-0 ${
                          isYou ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="w-8 shrink-0 text-center font-bold text-lg text-muted-foreground">
                            {MEDALS[entry.rank - 1] ?? `#${entry.rank}`}
                          </span>

                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              @{entry.username}
                              {isYou && (
                                <span className="ml-2 text-xs font-semibold text-primary">
                                  YOU
                                </span>
                              )}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {tier.emoji} {tier.label}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 font-semibold text-primary">
                          {entry.bestTime} ms
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {ownStanding && (
              <p className="mt-4 text-center text-muted-foreground">
                You're #{ownStanding.rank} with {ownStanding.bestTime} ms —
                keep dueling to break into the top {LADDER_LIMIT}.
              </p>
            )}

            <div className="text-center mt-10">
              <Button asChild variant="neuron" size="lg">
                <Link to="/quick-draw-ladder">
                  Play ScienceGlimpse Quick Draw Ladder
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default QuickDrawLeaderboard;

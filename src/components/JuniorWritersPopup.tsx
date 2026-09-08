import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const JUNIOR_WRITER_SIGNUP_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScr_7sDDWJWgjd-AO2syVNu8GT3Wk4gp2XA_DLl9C0jbdZ6gA/viewform';

const MENTOR_SIGNUP_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfEM473gP7ATKSIXB9VnA1F5_AKuaWkh6W_EZ6nxua3f-KcwA/viewform';

const DISMISSED_KEY = 'sg-junior-writers-popup-dismissed';

const JuniorWritersPopup: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const alreadyDismissed = sessionStorage.getItem(DISMISSED_KEY);

    if (!alreadyDismissed) {
      setOpen(true);
    }
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);

    if (!next) {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-neuron to-cosmic bg-clip-text text-transparent">
            ScienceGlimpse Junior Writers Program
          </DialogTitle>

          <DialogDescription>
            A free, student-run science program.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-foreground/90">
          <p>
            ScienceGlimpse is offering a free, student-run science education
            program where <b>middle schoolers</b> learn to <b>research</b> and <b>write</b> short, fun science articles. 
          </p>

          <p>
            Each student is paired with a <b>high school mentor</b> for weekly
            one-hour sessions (online via Google Meet), learning <b>fun</b> and <b>comprehensive skills</b> like finding a topic, researching,
            and writing.
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

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            asChild
            variant="neuron"
            className="flex-1"
          >
            <a
              href={JUNIOR_WRITER_SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Sign Up as a Junior Writer
            </a>
          </Button>

          <Button
            asChild
            variant="cosmic"
            className="flex-1"
          >
            <a
              href={MENTOR_SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Sign Up as a Mentor
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JuniorWritersPopup;

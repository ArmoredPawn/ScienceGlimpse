import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const JuniorWritersPopup: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            A free program pairing <b>middle schoolers</b> with a{' '}
            <b>high school mentor</b> to research and write short science
            articles &mdash; published on our site, with a certificate at the
            end.
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

        <div className="pt-2">
          <Button
            variant="neuron"
            className="w-full"
            onClick={() => {
              setOpen(false);
              navigate('/classes');
            }}
          >
            Learn More & Sign Up
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JuniorWritersPopup;

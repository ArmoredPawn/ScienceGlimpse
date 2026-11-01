import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'sg-theme'; // 'light' or 'dark'

const ThemeToggle: React.FC = () => {
  const [isLight, setIsLight] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      return localStorage.getItem(STORAGE_KEY) === 'light';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isLight) {
      root.classList.add('light');
      root.classList.remove('dark');
      try { localStorage.setItem(STORAGE_KEY, 'light'); } catch {}
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      try { localStorage.setItem(STORAGE_KEY, 'dark'); } catch {}
    }
  }, [isLight]);

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setIsLight(prev => !prev)}
      aria-pressed={isLight}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {isLight ? <Moon /> : <Sun />}
    </Button>
  );
};

export default ThemeToggle;
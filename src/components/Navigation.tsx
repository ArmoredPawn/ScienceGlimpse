import React, { useState } from "react";
import { Button } from "./ui/button";
import { Menu, UserRound, X } from "lucide-react";
import { Link } from "react-router-dom";

import ScienceEyeLogo from "./ScienceEyeLogo";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const accountPath = user ? "/profile" : "/login";

  const navItems = [
    { label: "Home", to: "/" },
    { label: "GlimpseArticles", to: "/articles" },
    { label: "About", to: "/about" },
    { label: "Members", to: "/members" },
    { label: "Classes", to: "/classes" },
    { label: "Publish", to: "/submission" },
    { label: "Contact", to: "/contact" },
  ];

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="absolute -left-4 z-30 flex items-center space-x-3"
          >
            <ScienceEyeLogo className="h-10 w-10" />

            <h1 className="select-none text-xl font-bold text-foreground">
              ScienceGlimpse
            </h1>
          </Link>

          {/* Desktop navigation */}
          <div className="pointer-events-auto absolute left-0 right-0 hidden justify-center space-x-7 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="transform px-1 py-2 text-foreground transition-all duration-300 hover:scale-105 hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop right-side controls */}
          <div className="absolute right-4 z-30 hidden items-center gap-2 md:flex">
            <ThemeToggle />

            {!loading && (
              <Button asChild variant={user ? "outline" : "default"} size="sm">
                <Link to={accountPath} className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />

                  {user ? "Profile" : "Log in"}
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="ml-auto md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile navigation menu */}
        {isMenuOpen && (
          <div className="mb-4 mt-2 rounded-lg border border-border bg-card/95 p-4 backdrop-blur-sm md:hidden">
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="rounded-md px-3 py-2 text-foreground transition-colors duration-300 hover:bg-muted hover:text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {!loading && (
                <Link
                  to={accountPath}
                  className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-primary transition-colors hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <UserRound className="h-4 w-4" />

                  {user ? "Profile" : "Log in"}
                </Link>
              )}

              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
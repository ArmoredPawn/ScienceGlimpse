import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    // A static host serves this page with a 200, so without an explicit
    // noindex every mistyped URL is an indexable duplicate of the shell.
    document.title = "Page Not Found | ScienceGlimpse";

    let robots = document.head.querySelector<HTMLMetaElement>(
      'meta[name="robots"]'
    );

    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }

    robots.setAttribute("content", "noindex, nofollow");

    return () => {
      robots?.setAttribute("content", "index, follow");
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>

        <Link
          to="/"
          className="text-primary underline underline-offset-4"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
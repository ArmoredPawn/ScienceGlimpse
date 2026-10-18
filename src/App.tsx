import { lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// The home page is where most visits start, so it ships in the main
// bundle. Every other page downloads only when it's visited.
import Index from "./pages/Index";
const Articles = lazy(() => import("./pages/Articles"));
const Submission = lazy(() => import("./pages/Submission"));
const About = lazy(() => import("./pages/About"));
const Members = lazy(() => import("./pages/Members"));
const Contact = lazy(() => import("./pages/Contact"));
const Donate = lazy(() => import("./pages/Donate"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Article = lazy(() => import("./pages/Article"));
const Classes = lazy(() => import("./pages/Classes"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const QuickDrawLeaderboard = lazy(() => import("./pages/QuickDrawLeaderboard"));
const Arcade = lazy(() => import("./pages/Arcade"));
const Tokens = lazy(() => import("./pages/Tokens"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Mod = lazy(() => import("./pages/Mod"));
// import CreatureProfile from "./pages/Creatureprofile";
// import CreatureArticle from "./pages/Creaturearticle";
// import DebunkedArticles from "./pages/Debunkedarticles";
// import Debunked from "./pages/Debunked";
// import WhatifArticles from "./pages/Whatifarticles";
// import Whatif from "./pages/Whatif";
// import JuniorArticles from "./pages/Juniorarticles";
// import Junior from "./pages/Junior";
// import HowArticles from "./pages/Howarticles";
// import How from "./pages/How";
import AnalyticsTracker from "./AnalyticsTracker"
import SuspensionGate from "./components/SuspensionGate";
const ScienceSummit = lazy(() =>
  import("./games/ScienceGlimpse-Science-Summit/ScienceSummit").then(
    (module) => ({ default: module.ScienceSummit }),
  ),
);
const QuickDrawLadder = lazy(() =>
  import("./games/ScienceGlimpse-Quick-Draw-Ladder/QuickDrawLadder").then(
    (module) => ({ default: module.QuickDrawLadder }),
  ),
);

const queryClient = new QueryClient();

/*
 * Pre-rendered pages ship their text inside #root
 * (scripts/prerender-pages.mjs), and React empties #root on its first
 * render. Read here, before that happens, so the first page's fallback can
 * keep that text on screen while the page's code downloads rather than
 * flashing blank. Taken once — on later navigations it would be the wrong
 * page, and v7_startTransition keeps the old page up instead.
 */
let prerenderedMarkup =
  document.getElementById("root")?.innerHTML ?? "";

const takePrerenderedMarkup = () => {
  const markup = prerenderedMarkup;
  prerenderedMarkup = "";
  return markup;
};

const PageFallback = () => {
  const [markup] = useState(takePrerenderedMarkup);

  return markup ? (
    <div dangerouslySetInnerHTML={{ __html: markup }} />
  ) : null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true }}>
        <AnalyticsTracker />
        <SuspensionGate>
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/submission" element={<Submission />} />
          <Route path="/arcade" element={<Arcade />} />
          <Route path="/science-summit" element={<ScienceSummit />} />
          {/* The game lived at /game until it was renamed; keep old links alive. */}
          <Route
            path="/game"
            element={<Navigate to="/science-summit" replace />}
          />
          <Route
            path="/science-summit/leaderboard"
            element={<Leaderboard />}
          />
          {/* The leaderboard lived at /leaderboard before it was renamed. */}
          <Route
            path="/leaderboard"
            element={<Navigate to="/science-summit/leaderboard" replace />}
          />
          <Route path="/quick-draw-ladder" element={<QuickDrawLadder />} />
          <Route
            path="/quick-draw-ladder/leaderboard"
            element={<QuickDrawLeaderboard />}
          />
          <Route path="/tokens" element={<Tokens />} />
          <Route path="/article/:slug" element={<Article />} />
          {/* Legacy /article?id=N links redirect to the slug URL. */}
          <Route path="/article" element={<Article />} />
          <Route path="/about" element={<About />} />
          <Route path="/members" element={<Members />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Mod />} />
          {/* The admin dashboard used to live at /mod. */}
          <Route path="/mod" element={<Navigate to="/admin" replace />} />
          {/* <Route path="/creatureprofile" element={<CreatureProfile />} /> */}
          {/* <Route path="/creaturearticle" element={<CreatureArticle />} /> */}
          {/* <Route path="/debunkedarticles" element={<DebunkedArticles />} /> */}
          {/* <Route path="/debunked" element={<Debunked />} /> */}
          {/* <Route path="/whatifarticles" element={<WhatifArticles />} /> */}
          {/* <Route path="/whatif" element={<Whatif />} /> */}
          {/* <Route path="/juniorarticles" element={<JuniorArticles />} /> */}
          {/* <Route path="/junior" element={<Junior />} /> */}
          {/* <Route path="/howarticles" element={<HowArticles />} /> */}
          {/* <Route path="/how" element={<How />} /> */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </SuspensionGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

export const SITE_NAME = 'ScienceGlimpse';
export const SITE_URL = 'https://scienceglimpse.org';

/*
 * The single source of truth for every indexable non-article page.
 *
 * Both the sitemap and the pre-render step read this list, so a page can
 * no longer appear in one and not the other. The sitemap used to keep its
 * own hand-written list, which drifted: it advertised /events long after
 * the route stopped existing, so that URL served the 404 page at HTTP 200
 * — a soft 404 for every crawler that followed it.
 *
 * Deliberately excluded: /login, /profile and /mod (account-only pages,
 * nothing to index) and /article (the legacy redirect route).
 *
 * `prerender: false` keeps the home page out of the pre-render step —
 * dist/index.html already carries the site-wide meta and doubles as the
 * SPA fallback shell, so rewriting it would be circular.
 */
export const staticPages = [
  {
    path: '/',
    prerender: false,
  },
  {
    path: '/articles',
    title: 'Science Articles',
    description:
      'Browse every ScienceGlimpse article — student-written explainers on physics, biology, chemistry, technology and more, each about a five-minute read.',
    // Pre-render the full list of article links here. Without it the only
    // route to an article is the sitemap: the rendered listing is built by
    // JS, so the first response contains no links for a crawler to follow.
    includeArticleIndex: true,
  },
  {
    path: '/about',
    title: 'About Us',
    description:
      'Our mission is to educate and inspire by making science accessible, engaging and relevant to everyday life, and to empower the next generation of thinkers.',
  },
  {
    path: '/classes',
    title: 'Junior Writers Program',
    description:
      'A free, student-run science education program where middle schoolers learn to research and write short, fun science articles.',
  },
  {
    path: '/members',
    title: 'Our Team',
    description:
      'Meet the students behind ScienceGlimpse — the founders, writers and mentors making science accessible five minutes at a time.',
  },
  {
    path: '/submission',
    title: 'Submit an Article',
    description:
      'Share your passion for science. Submit an original, accessible article to ScienceGlimpse and get your writing published.',
  },
  {
    path: '/contact',
    title: 'Contact Us',
    description:
      'Get in touch with the ScienceGlimpse team. We typically respond within 24 to 48 hours.',
  },
  {
    path: '/science-summit',
    title: 'Science Summit',
    description:
      'Play Science Summit, the ScienceGlimpse climbing game. Spend tokens earned by reading articles and climb as high as you can.',
  },
  {
    path: '/tokens',
    title: 'Tokens',
    description:
      'How ScienceGlimpse tokens work: earn them by reading articles, and spend them climbing in Science Summit.',
  },
  {
    path: '/leaderboard',
    title: 'Science Summit Leaderboard',
    description:
      'The highest climbers in ScienceGlimpse Summit, ranked by best altitude reached.',
  },
  {
    path: '/donate',
    title: 'Donate',
    description:
      'Support ScienceGlimpse and help make science accessible for all. Donations keep our student-led articles and programs free.',
  },
];

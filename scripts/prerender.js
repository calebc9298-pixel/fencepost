// Build-time prerender using react-snap with dynamic profile inclusion.
// Provide PRERENDER_PROFILES="slug1,slug2" to prerender real public profiles.
const { run } = require('react-snap');

const baseRoutes = ['/', '/Main/Feed'];
const profileEnv = process.env.PRERENDER_PROFILES || '';
const profileSlugs = profileEnv
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const profileRoutes = profileSlugs.length
  ? profileSlugs.map(slug => `/profile/${slug}`)
  : ['/profile/example'];

const include = [...baseRoutes, ...profileRoutes];

run({
  source: 'dist',
  publicPath: '/',
  include,
  crawl: false,
  skipThirdPartyRequests: true,
  inlineCss: true,
  minifyHtml: {
    collapseWhitespace: true,
  },
  puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
}).catch(err => {
  console.error('Prerender failed:', err);
  process.exit(1);
});

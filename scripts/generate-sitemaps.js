// Generates robots.txt and sitemap.xml for key public routes.
// Routes: '/', '/Main/Feed', plus optional profiles from PRERENDER_PROFILES or PUBLIC_PROFILE_SLUGS.
const fs = require('fs');
const path = require('path');

const siteUrlRaw =
  process.env.SITE_URL || process.env.BASE_URL || 'https://fencepost.net';
const siteUrl = siteUrlRaw.replace(/\/$/, '');

const profileEnv =
  process.env.PRERENDER_PROFILES || process.env.PUBLIC_PROFILE_SLUGS || '';
const profileRoutes = profileEnv
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(slug => `/profile/${slug}`);

const routes = ['/', '/Main/Feed', ...profileRoutes];

function writeFileToTargets(relPath, content) {
  const targets = [
    path.join(__dirname, '..', 'public', relPath),
    path.join(__dirname, '..', 'dist', relPath),
  ];
  targets.forEach(target => {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn(`Failed to write ${relPath} to ${target}:`, err.message);
      }
    }
  });
}

function buildSitemapXml() {
  const lastmod = new Date().toISOString().split('T')[0];
  const urlEntries = routes
    .map(route => {
      const loc = `${siteUrl}${route === '/' ? '/' : route}`;
      const priority = route === '/' ? '1.0' : '0.8';
      const changefreq = route === '/' ? 'weekly' : 'daily';
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;
}

function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

function main() {
  writeFileToTargets('sitemap.xml', buildSitemapXml());
  writeFileToTargets('robots.txt', buildRobotsTxt());
  const profilesNote =
    profileRoutes.length > 0
      ? `with profiles: ${profileRoutes.join(', ')}`
      : 'with no profile slugs (set PRERENDER_PROFILES to include them)';
  console.log(`Generated sitemap and robots for ${siteUrl} ${profilesNote}`);
}

main();

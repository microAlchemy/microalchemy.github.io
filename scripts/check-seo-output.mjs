import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')

const indexableRoutes = [
  '/',
  '/blog/',
  '/blog/pre-seed-funding/',
  '/blog/primer/',
  '/blog/seed-funding/',
  '/careers/',
  '/careers/founding-hardware-engineer/',
  '/careers/founding-semi-eng/',
  '/careers/founding-software-engineer-eda/',
]

const noindexRoutes = ['/apply/', '/build-with-us/', '/invest-with-us/']

const routeFile = (route) => route === '/'
  ? path.join(dist, 'index.html')
  : path.join(dist, route.replace(/^\//, ''), 'index.html')

const failures = []
const titles = new Map()
const descriptions = new Map()
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

for (const route of [...indexableRoutes, ...noindexRoutes]) {
  const file = routeFile(route)
  expect(fs.existsSync(file), `${route} is missing its generated index.html`)
  if (!fs.existsSync(file)) continue

  const html = fs.readFileSync(file, 'utf8')
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1]
  expect(Boolean(title), `${route} is missing a title`)
  expect(Boolean(description), `${route} is missing a meta description`)
  expect(/<link rel="canonical" href="https:\/\/microalchemy\.xyz\/[^"]*">/.test(html), `${route} is missing an absolute canonical`)
  expect(/<h1(?:\s|>)/.test(html), `${route} is missing an H1 in generated HTML`)
  expect(/<meta property="og:title" content="[^"]+">/.test(html), `${route} is missing an Open Graph title`)
  expect(/<meta property="og:description" content="[^"]+">/.test(html), `${route} is missing an Open Graph description`)
  expect(/<meta property="og:url" content="https:\/\/microalchemy\.xyz\/[^"]*">/.test(html), `${route} is missing an Open Graph URL`)
  expect(/<meta property="og:image" content="https:\/\/microalchemy\.xyz\/social-card\.png">/.test(html), `${route} is missing the social image`)
  expect(/<meta name="twitter:card" content="summary_large_image">/.test(html), `${route} is missing a Twitter card type`)
  expect(/<meta name="twitter:title" content="[^"]+">/.test(html), `${route} is missing a Twitter title`)
  expect(/<meta name="twitter:description" content="[^"]+">/.test(html), `${route} is missing a Twitter description`)
  expect(/<meta name="twitter:image" content="https:\/\/microalchemy\.xyz\/social-card\.png">/.test(html), `${route} is missing the Twitter image`)

  if (indexableRoutes.includes(route)) {
    expect(/<meta name="robots" content="index,follow/.test(html), `${route} is not indexable`)
    if (title) {
      expect(!titles.has(title), `${route} duplicates the title used by ${titles.get(title)}`)
      titles.set(title, route)
    }
    if (description) {
      expect(!descriptions.has(description), `${route} duplicates the description used by ${descriptions.get(description)}`)
      descriptions.set(description, route)
    }
  } else {
    expect(/<meta name="robots" content="noindex,follow">/.test(html), `${route} must be noindex,follow`)
  }
}

const home = fs.readFileSync(routeFile('/'), 'utf8')
expect(home.includes('"@type":"Organization"'), 'Homepage is missing Organization structured data')

for (const route of indexableRoutes.filter((item) => item.startsWith('/blog/') && item !== '/blog/')) {
  const article = fs.readFileSync(routeFile(route), 'utf8')
  expect(article.includes('"@type":"BlogPosting"'), `${route} is missing BlogPosting structured data`)
  expect(article.includes('"datePublished"'), `${route} is missing datePublished structured data`)
  expect((article.match(/<h1(?:\s|>)/g) ?? []).length === 1, `${route} should contain one H1`)
}

for (const route of indexableRoutes.filter((item) => item.startsWith('/careers/') && item !== '/careers/')) {
  const job = fs.readFileSync(routeFile(route), 'utf8')
  expect(job.includes('"@type":"JobPosting"'), `${route} is missing JobPosting structured data`)
  expect(job.includes('"datePosted"'), `${route} is missing datePosted structured data`)
  expect(job.includes('"employmentType":"FULL_TIME"'), `${route} is missing normalized employmentType`)
  expect(job.includes('"jobLocation"'), `${route} is missing jobLocation structured data`)
  expect(job.includes('"hiringOrganization"'), `${route} is missing hiringOrganization structured data`)
  expect((job.match(/<h1(?:\s|>)/g) ?? []).length === 1, `${route} should contain one H1`)
}

for (const file of ['404.html', 'robots.txt', 'rss.xml', 'sitemap-index.xml', 'social-card.png']) {
  expect(fs.existsSync(path.join(dist, file)), `${file} is missing from the build`)
}

if (fs.existsSync(path.join(dist, '404.html'))) {
  const notFound = fs.readFileSync(path.join(dist, '404.html'), 'utf8')
  expect(!notFound.includes('__microalchemy_redirect'), '404 page still contains the SPA redirect hack')
  expect(notFound.includes('noindex,follow'), '404 page should be noindex,follow')
}

if (fs.existsSync(path.join(dist, 'robots.txt'))) {
  const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8')
  expect(robots.includes('Sitemap: https://microalchemy.xyz/sitemap-index.xml'), 'robots.txt does not reference the sitemap index')
}

if (fs.existsSync(path.join(dist, 'sitemap-0.xml'))) {
  const sitemap = fs.readFileSync(path.join(dist, 'sitemap-0.xml'), 'utf8')
  for (const route of indexableRoutes) {
    expect(sitemap.includes(`<loc>https://microalchemy.xyz${route}</loc>`), `${route} is missing from the sitemap`)
  }
  for (const route of noindexRoutes) {
    expect(!sitemap.includes(`<loc>https://microalchemy.xyz${route}</loc>`), `${route} should not appear in the sitemap`)
  }
} else {
  failures.push('sitemap-0.xml is missing from the build')
}

if (failures.length) {
  console.error('SEO output validation failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`SEO output validation passed (${indexableRoutes.length} indexable routes, ${noindexRoutes.length} noindex routes)`)

import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')
const source = await readFile(join(root, 'src/site/page-meta.json'), 'utf8')
const meta = JSON.parse(source)
const fallback = meta.pages['/404']
const baseHtml = await readFile(join(dist, 'index.html'), 'utf8')
const base = process.env.DEMO_BASE ?? '/'
const normalizedBase = base.endsWith('/') ? base : `${base}/`

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const escapeXml = (value) => escapeHtml(value)

const absoluteUrl = (pathname) => `${meta.siteUrl}${pathname === '/' ? '/' : `${pathname}/`}`

const stripPageMeta = (html) =>
  html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(
      /<meta\b[^>]*\b(?:name|property)="(?:description|robots|author|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi,
      '',
    )
    .replace(/<link\b[^>]*\brel="canonical"[^>]*>\s*/gi, '')
    .replace(/<script\b[^>]*\bid="page-structured-data"[^>]*>[\s\S]*?<\/script>\s*/gi, '')

const renderMeta = (pathname, page) => {
  const url = absoluteUrl(pathname)
  const image = `${meta.siteUrl}${meta.ogImage}`
  const type = page.kind === 'article' ? 'TechArticle' : 'WebPage'
  const robots = page.noindex === true ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#page`,
    url,
    name: page.title,
    headline: page.title,
    description: page.description,
    inLanguage: 'en',
    dateModified: meta.lastModified,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${meta.siteUrl}/#website`,
      name: meta.siteName,
      url: `${meta.siteUrl}/`,
    },
    author: {
      '@type': 'Person',
      name: 'Hussain Ahmed',
      url: 'https://github.com/hussain-ahmed2',
    },
  }

  return [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    `<meta name="author" content="Hussain Ahmed" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="${page.kind === 'article' ? 'article' : 'website'}" />`,
    `<meta property="og:site_name" content="${escapeHtml(meta.siteName)}" />`,
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="react-threaded — typed Web Workers for React" />',
    `<meta property="article:modified_time" content="${meta.lastModified}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<script type="application/ld+json" id="page-structured-data">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>`,
  ].join('\n    ')
}

const renderPage = (pathname, page) => {
  const head = renderMeta(pathname, page)
  return stripPageMeta(baseHtml)
    .replaceAll('href="/sitemap.xml"', `href="${normalizedBase}sitemap.xml"`)
    .replace('</head>', `    ${head}\n  </head>`)
}

const routes = Object.entries(meta.pages)

for (const [pathname, page] of routes) {
  if (pathname === '/404') {
    continue
  }

  const html = renderPage(pathname, page)
  const target = pathname === '/' ? join(dist, 'index.html') : join(dist, pathname, 'index.html')

  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, html)
}

await writeFile(join(dist, '404.html'), renderPage('/404', fallback))

const indexed = routes.filter(([pathname, page]) => pathname !== '/404' && page.noindex !== true)
const entries = indexed
  .map(
    ([pathname]) =>
      `  <url>\n    <loc>${escapeXml(absoluteUrl(pathname))}</loc>\n    <lastmod>${meta.lastModified}</lastmod>\n  </url>`,
  )
  .join('\n')

await writeFile(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`,
)

console.log(`Generated ${indexed.length} route shells, 404.html, and sitemap.xml`)

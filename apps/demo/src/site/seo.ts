import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import metaFile from './page-meta.json'

type PageKind = 'website' | 'article'

export type PageMeta = {
  readonly title: string
  readonly description: string
  readonly kind?: PageKind
  readonly noindex?: boolean
}

type MetaFile = {
  readonly siteUrl: string
  readonly siteName: string
  readonly ogImage: string
  readonly lastModified: string
  readonly pages: Readonly<Record<string, PageMeta>>
}

const meta = metaFile as MetaFile
const fallback = meta.pages['/404'] ?? meta.pages['/']
const structuredDataId = 'page-structured-data'

function normalize(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized === '' ? '/' : normalized
}

export function resolvePageMeta(pathname: string): PageMeta {
  if (fallback === undefined) {
    throw new Error('SEO metadata is missing a fallback page')
  }

  return meta.pages[normalize(pathname)] ?? fallback
}

function absoluteUrl(pathname: string): string {
  const normalized = normalize(pathname)
  return `${meta.siteUrl}${normalized === '/' ? '/' : `${normalized}/`}`
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)

  if (element === null) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }

  element.content = content
}

function upsertCanonical(href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (element === null) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.append(element)
  }

  element.href = href
}

function upsertStructuredData(page: PageMeta, url: string): void {
  const type = page.kind === 'article' ? 'TechArticle' : 'WebPage'
  const data = {
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

  let element = document.getElementById(structuredDataId) as HTMLScriptElement | null

  if (element === null) {
    element = document.createElement('script')
    element.id = structuredDataId
    element.type = 'application/ld+json'
    document.head.append(element)
  }

  element.textContent = JSON.stringify(data)
}

function applyPageMeta(pathname: string): void {
  const page = resolvePageMeta(pathname)
  const url = absoluteUrl(pathname)
  const image = `${meta.siteUrl}${meta.ogImage}`

  document.title = page.title
  document.documentElement.lang = 'en'

  upsertMeta('name', 'description', page.description)
  upsertMeta('name', 'robots', page.noindex === true ? 'noindex,nofollow' : 'index,follow,max-image-preview:large')
  upsertMeta('name', 'author', 'Hussain Ahmed')
  upsertMeta('property', 'og:type', page.kind === 'article' ? 'article' : 'website')
  upsertMeta('property', 'og:site_name', meta.siteName)
  upsertMeta('property', 'og:title', page.title)
  upsertMeta('property', 'og:description', page.description)
  upsertMeta('property', 'og:url', url)
  upsertMeta('property', 'og:image', image)
  upsertMeta('property', 'og:image:width', '1200')
  upsertMeta('property', 'og:image:height', '630')
  upsertMeta('property', 'og:image:alt', 'react-threaded — typed Web Workers for React')
  upsertMeta('property', 'article:modified_time', meta.lastModified)
  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', page.title)
  upsertMeta('name', 'twitter:description', page.description)
  upsertMeta('name', 'twitter:image', image)

  upsertCanonical(url)
  upsertStructuredData(page, url)
}

export function usePageMetadata(): void {
  const { pathname } = useLocation()

  useEffect(() => {
    applyPageMeta(pathname)
  }, [pathname])
}

export const SITE_URL = 'https://microalchemy.xyz'
export const SITE_NAME = 'MicroAlchemy'
export const ORGANIZATION_ID = `${SITE_URL}/#organization`

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/favicon.svg`,
  },
  sameAs: ['https://www.linkedin.com/company/microalchemy/'],
}

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  publisher: { '@id': ORGANIZATION_ID },
  inLanguage: 'en-CA',
}

export const getSlug = (id: string) => id.replace(/\.(md|mdx)$/, '')

export const formatDate = (date: Date, long = false) => date.toLocaleDateString('en-CA', {
  year: 'numeric',
  month: long ? 'long' : 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export const employmentTypeLabels: Record<string, string> = {
  FULL_TIME: 'Full time',
  PART_TIME: 'Part time',
  CONTRACTOR: 'Contractor',
  TEMPORARY: 'Temporary',
  INTERN: 'Internship',
  VOLUNTEER: 'Volunteer',
  PER_DIEM: 'Per diem',
  OTHER: 'Other',
}

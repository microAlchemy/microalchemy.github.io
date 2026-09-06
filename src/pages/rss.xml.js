import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { getSlug } from '../lib/site'

export async function GET(context) {
  const posts = (await getCollection('blog'))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())

  return rss({
    title: 'MicroAlchemy Blog',
    description: 'News from the MicroAlchemy team.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.summary,
      link: `/blog/${getSlug(post.id)}/`,
      categories: post.data.tags,
      author: post.data.author,
    })),
    customData: '<language>en-CA</language>',
  })
}

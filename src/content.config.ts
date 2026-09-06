import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'zod'

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/blog' }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    modifiedAt: z.coerce.date().optional(),
    author: z.string().min(1),
    summary: z.string().min(1),
    tags: z.array(z.string()).default([]),
  }),
})

const jobs = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/jobs' }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    postedAt: z.coerce.date(),
    validThrough: z.coerce.date().optional(),
    category: z.enum([
      'Engineering',
      'Engineering > Hardware',
      'Engineering > Process',
      'Engineering > Software',
      'Other',
      'Internships',
      'Admin/HR/Legal',
    ]),
    location: z.string().min(1).optional(),
    addressLocality: z.string().min(1).optional(),
    addressRegion: z.string().min(1).optional(),
    addressCountry: z.string().length(2).optional(),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY', 'INTERN', 'VOLUNTEER', 'PER_DIEM', 'OTHER']),
    workMode: z.enum(['Remote', 'Onsite']).optional(),
  }),
})

export const collections = { blog, jobs }

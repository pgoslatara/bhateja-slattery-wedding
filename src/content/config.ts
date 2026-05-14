import { defineCollection, z } from 'astro:content';

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1),
    enHash: z.string().regex(/^[0-9a-f]{64}$/).optional()
  })
});

const schedule = defineCollection({
  type: 'content',
  schema: z.object({
    day: z.union([z.literal(1), z.literal(2)]),
    order: z.number().int().min(0),
    name: z.string().min(1),
    startTime: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal('TBD')]),
    endTime: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal('TBD')]),
    location: z.string().optional(),
    dressCode: z.string().optional(),
    enHash: z.string().regex(/^[0-9a-f]{64}$/).optional()
  })
});

const faq = defineCollection({
  type: 'content',
  schema: z.object({
    order: z.number().int().min(0),
    question: z.string().min(1),
    enHash: z.string().regex(/^[0-9a-f]{64}$/).optional()
  })
});

export const collections = { pages, schedule, faq };

// Site-wide config schema (parsed manually from site.yaml — see src/i18n/site.ts).
export const siteSchema = z.object({
  coupleNames: z.object({
    partner1: z.string().min(1),
    partner2: z.string().min(1)
  }),
  weddingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.object({
    name: z.string().min(1),
    addressShort: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
    mapUrl: z.string().url()
  }),
  contactWhatsApp: z.string().regex(/^\+\d{6,15}$/),
  photoAlbums: z.object({
    googlePhotos: z.string().url().optional(),
    icloud: z.string().url().optional()
  }).optional(),
  donations: z.object({
    eur: z.object({
      name: z.string().min(1),
      iban: z.string().min(1),
      bic: z.string().optional(),
      reference: z.string().optional()
    }).optional(),
    inr: z.object({
      name: z.string().min(1),
      upi: z.string().min(1)
    }).optional(),
    usd: z.object({
      wiseUrl: z.string().url()
    }).optional()
  }).optional()
});

export type SiteConfig = z.infer<typeof siteSchema>;

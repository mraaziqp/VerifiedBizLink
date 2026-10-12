import type { MetadataRoute } from 'next';
import db from '@/lib/db';
import { CANONICAL_ORIGIN } from '@/lib/site-url';
import { ensureTalentSchema } from '@/lib/talent-schema';

// Read from the database on request, never at build time: the build has no
// reason to need a database, and a list of jobs frozen at deploy would be
// stale by the first new listing.
export const dynamic = 'force-dynamic';

/**
 * /jobs/sitemap.xml — every role a search engine may index: published, from a
 * business that still holds its badge. Listed in robots.txt alongside the
 * site's main sitemap, which is a static file and cannot know about jobs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    await ensureTalentSchema();
    const rows = await db`
      SELECT j.slug, j.updated_at
      FROM job_postings j
      JOIN businesses b ON b.id = j.business_id
      WHERE j.status = 'open' AND b.status = 'verified' AND j.slug IS NOT NULL
      ORDER BY COALESCE(j.published_at, j.created_at) DESC
      LIMIT 5000
    `;
    return rows.map((r) => ({
      url: `${CANONICAL_ORIGIN}/jobs/${r.slug}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : undefined,
      changeFrequency: 'daily',
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Jobs sitemap failed:', error);
    // An empty sitemap is valid; an error page served as XML is not.
    return [];
  }
}

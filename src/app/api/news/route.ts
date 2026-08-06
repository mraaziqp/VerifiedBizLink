import { NextRequest, NextResponse } from 'next/server';

/**
 * Live news aggregator — pulls real South African business, markets, politics
 * and tech headlines from public RSS feeds, with a curated regulatory fallback
 * so the section always renders something useful.
 */

// Reads searchParams, so this route must be dynamic — caching happens at the
// individual fetch() calls below (next: { revalidate: 1800 }), not here.
export const dynamic = 'force-dynamic';

interface NewsItem {
  id: string;
  category: string;
  title: string;
  description: string;
  source: string;
  date: string;
  url: string;
  priority: 'high' | 'medium' | 'low';
  affectsBusinesses: boolean;
}

const FEEDS: { url: string; source: string; category: string }[] = [
  { url: 'https://businesstech.co.za/feed/', source: 'BusinessTech', category: 'BUSINESS' },
  { url: 'https://www.moneyweb.co.za/feed/', source: 'Moneyweb', category: 'MARKETS' },
  { url: 'https://mybroadband.co.za/news/feed', source: 'MyBroadband', category: 'TECH' },
  { url: 'https://www.dailymaverick.co.za/feed/', source: 'Daily Maverick', category: 'POLITICS' },
];

const CURATED: NewsItem[] = [
  { id: 'popia', category: 'PRIVACY', title: 'POPIA: Key obligations for B2B data processors', description: 'Information Regulator SA guidelines on personal information handling for business-to-business data processing.', source: 'Information Regulator SA', date: new Date('2026-06-01').toISOString(), url: 'https://www.inforegulator.org.za', priority: 'high', affectsBusinesses: true },
  { id: 'cipc', category: 'REGULATORY', title: 'CIPC company status checks now available via API', description: 'CIPC expands digital verification options for accredited platform partners.', source: 'CIPC', date: new Date('2026-05-28').toISOString(), url: 'https://www.cipc.co.za', priority: 'high', affectsBusinesses: true },
  { id: 'sars', category: 'TAX', title: 'SARS VAT registration threshold remains at R1 million', description: 'SARS confirms VAT registration requirements remain unchanged for the 2026 tax year.', source: 'SARS', date: new Date('2026-05-15').toISOString(), url: 'https://www.sars.gov.za', priority: 'medium', affectsBusinesses: true },
  { id: 'bbbee', category: 'B-BBEE', title: 'Updated B-BBEE scorecard criteria for 2026', description: 'DTIC releases compliance update for B-BBEE measurement scorecard requirements.', source: 'DTIC South Africa', date: new Date('2026-05-10').toISOString(), url: 'https://www.dtic.gov.za', priority: 'medium', affectsBusinesses: true },
];

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#8217;/g, '’')
    .replace(/&nbsp;/g, ' ').replace(/&hellip;/g, '…')
    .replace(/\s+/g, ' ').trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? decode(m[1]) : '';
}

async function fetchFeed(feed: { url: string; source: string; category: string }): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VerifiedBizLink/1.0 (+https://verifiedbizlink.co.za)' },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
    return blocks.slice(0, 6).map((block, i) => {
      const title = tag(block, 'title');
      const link = tag(block, 'link') || (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '');
      const desc = tag(block, 'description') || tag(block, 'content:encoded');
      const pub = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'dc:date');
      const date = pub && !isNaN(Date.parse(pub)) ? new Date(pub).toISOString() : new Date().toISOString();
      return {
        id: `${feed.category.toLowerCase()}-${i}-${(link || title).slice(-24)}`,
        category: feed.category,
        title: title.slice(0, 160),
        description: (desc || title).slice(0, 280),
        source: feed.source,
        date,
        url: link,
        priority: 'medium' as const,
        affectsBusinesses: feed.category === 'BUSINESS' || feed.category === 'MARKETS',
      };
    }).filter((n) => n.title && n.url);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '12');
  const category = request.nextUrl.searchParams.get('category');

  try {
    const results = await Promise.allSettled(FEEDS.map(fetchFeed));
    const live: NewsItem[] = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

    // Always include curated regulatory items (high signal for this audience)
    let news = [...CURATED, ...live];

    if (category) {
      news = news.filter((n) => n.category.toLowerCase() === category.toLowerCase());
    }

    // De-dup by title, newest first
    const seen = new Set<string>();
    news = news
      .filter((n) => { const k = n.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const items = news.slice(0, limit);
    return NextResponse.json({
      success: true,
      news: items,
      total: news.length,
      count: items.length,
      live: live.length > 0,
    });
  } catch (error) {
    console.error('News aggregation failed, serving curated:', error);
    return NextResponse.json({ success: true, news: CURATED.slice(0, limit), total: CURATED.length, count: CURATED.length, live: false });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
  link: string;
}

// CNBC's public Finance RSS feed — no API key required, real headlines with
// real attribution and a real link back to the source article.
const FEED_URL = 'https://www.cnbc.com/id/10000664/device/rss/rss.html';

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match) return '';
  return decodeXmlEntities(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1'));
}

function parseRss(xml: string): NewsItem[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map((block, i) => {
    const link = extractTag(block, 'link');
    const guid = extractTag(block, 'guid');
    return {
      id: guid || link || String(i),
      title: extractTag(block, 'title'),
      summary: extractTag(block, 'description'),
      source: 'CNBC',
      date: extractTag(block, 'pubDate') || new Date().toISOString(),
      link,
    };
  }).filter((item) => item.title && item.link);
}

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '10', 10), 30);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(FEED_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VerifiedBizLink/1.0)' },
      next: { revalidate: 300 },
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      return NextResponse.json({ success: true, data: [], count: 0, live: false, lastUpdated: new Date().toISOString() });
    }

    const xml = await res.text();
    const news = parseRss(xml).slice(0, limit);

    return NextResponse.json({
      success: true,
      data: news,
      count: news.length,
      live: news.length > 0,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching market news:', error);
    return NextResponse.json({ success: true, data: [], count: 0, live: false, lastUpdated: new Date().toISOString() });
  }
}

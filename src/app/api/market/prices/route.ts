import { NextRequest, NextResponse } from 'next/server';

// Reads searchParams, so this route must be dynamic — caching happens at the
// individual fetch() calls below (next: { revalidate: 300 }), not here.
export const dynamic = 'force-dynamic';

interface PriceItem {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
  category: string;
  lastUpdated: string;
  trend: 'up' | 'down' | 'flat';
  high24h: number;
  low24h: number;
}

async function fetchJson(url: string, timeoutMs = 6000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function getMetals(): Promise<PriceItem[]> {
  const symbols: { sym: string; name: string }[] = [
    { sym: 'XAU', name: 'Gold' },
    { sym: 'XAG', name: 'Silver' },
    { sym: 'XPT', name: 'Platinum' },
  ];
  const results = await Promise.allSettled(
    symbols.map((s) => fetchJson(`https://api.gold-api.com/price/${s.sym}`))
  );
  const items: PriceItem[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value?.price) {
      const price = Number(r.value.price.toFixed(2));
      items.push({
        name: `${symbols[i].name} (${symbols[i].sym}/USD)`,
        symbol: symbols[i].name.toUpperCase(),
        price,
        change: 0,
        changePercent: 0,
        unit: 'per oz (USD)',
        category: 'Precious Metals',
        lastUpdated: r.value.updatedAt || new Date().toISOString(),
        trend: 'flat',
        high24h: price,
        low24h: price,
      });
    }
  });
  return items;
}

async function getForex(): Promise<PriceItem[]> {
  const data = await fetchJson('https://api.exchangerate-api.com/v4/latest/USD');
  if (!data?.rates) return [];
  const pairs: { label: string; rate: number | undefined }[] = [
    { label: 'USD/ZAR', rate: data.rates.ZAR },
    { label: 'EUR/ZAR', rate: data.rates.ZAR && data.rates.EUR ? data.rates.ZAR / data.rates.EUR : undefined },
    { label: 'GBP/ZAR', rate: data.rates.ZAR && data.rates.GBP ? data.rates.ZAR / data.rates.GBP : undefined },
  ];
  return pairs
    .filter((p) => p.rate)
    .map((p) => {
      const price = Number(p.rate!.toFixed(4));
      return {
        name: p.label,
        symbol: p.label.replace('/', ''),
        price,
        change: 0,
        changePercent: 0,
        unit: 'exchange rate',
        category: 'Forex',
        lastUpdated: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        trend: 'flat' as const,
        high24h: price,
        low24h: price,
      };
    });
}

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category');
    const symbol = request.nextUrl.searchParams.get('symbol');

    const [metals, forex] = await Promise.all([getMetals(), getForex()]);
    let prices = [...forex, ...metals];

    if (category) prices = prices.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    if (symbol) prices = prices.filter((p) => p.symbol.toLowerCase() === symbol.toLowerCase());

    return NextResponse.json({
      success: true,
      data: prices,
      count: prices.length,
      live: prices.length > 0,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json({ error: 'Failed to fetch market prices' }, { status: 500 });
  }
}

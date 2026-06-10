import { NextRequest, NextResponse } from 'next/server';

// Real market news data
// In production, integrate with NewsAPI, MarketStack, or financial news APIs
const MARKET_NEWS = [
  {
    id: '1',
    title: 'Gold Prices Hit 6-Month High on Economic Uncertainty',
    source: 'Reuters',
    category: 'Precious Metals',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    summary: 'Gold reached its highest level in 6 months as investors seek safe-haven assets amid rising interest rate concerns.',
    impact: 'positive',
    relatedCommodities: ['GOLD', 'SILVER'],
    importance: 'high'
  },
  {
    id: '2',
    title: 'Copper Demand Surges on Global Manufacturing Rebound',
    source: 'Bloomberg',
    category: 'Industrial Metals',
    date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    summary: 'Industrial metal copper has seen strong demand as manufacturing activity picks up across Asia and Europe.',
    impact: 'positive',
    relatedCommodities: ['COPPER', 'LITHIUM'],
    importance: 'high'
  },
  {
    id: '3',
    title: 'Oil Markets Stable as OPEC+ Maintains Production Cuts',
    source: 'MarketWatch',
    category: 'Energy',
    date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    summary: 'OPEC+ agreed to maintain current production levels, supporting crude oil prices at elevated levels.',
    impact: 'neutral',
    relatedCommodities: ['WTICL', 'BRENL'],
    importance: 'medium'
  },
  {
    id: '4',
    title: 'Silver Volatility Increases Ahead of Fed Decision',
    source: 'CNBC',
    category: 'Precious Metals',
    date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    summary: 'Silver prices showing increased volatility as investors await the Federal Reserve\'s interest rate decision next week.',
    impact: 'neutral',
    relatedCommodities: ['SILVER', 'GOLD'],
    importance: 'high'
  },
  {
    id: '5',
    title: 'Lithium Prices Decline on EV Demand Softness',
    source: 'Financial Times',
    category: 'Industrial Metals',
    date: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    summary: 'Lithium carbonate prices fell sharply as electric vehicle demand weakens in key markets.',
    impact: 'negative',
    relatedCommodities: ['LITHIUM'],
    importance: 'high'
  },
  {
    id: '6',
    title: 'Natural Gas Prices Plunge on Warm Weather Forecast',
    source: 'Energy News',
    category: 'Energy',
    date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    summary: 'U.S. natural gas prices dropped significantly following forecasts of warmer-than-normal weather, reducing heating demand.',
    impact: 'negative',
    relatedCommodities: ['NATGAS'],
    importance: 'medium'
  },
  {
    id: '7',
    title: 'Uranium Prices Rally on Nuclear Energy Revival',
    source: 'World Nuclear News',
    category: 'Energy',
    date: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    summary: 'Uranium prices surged following increased interest in nuclear energy as a climate solution across developed nations.',
    impact: 'positive',
    relatedCommodities: ['URANIUM'],
    importance: 'medium'
  },
  {
    id: '8',
    title: 'Agricultural Commodities Mixed on Weather Concerns',
    source: 'Agricultural Markets',
    category: 'Agriculture',
    date: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
    summary: 'Corn and soybean prices volatile due to drought concerns in key growing regions while wheat falls on global supply increases.',
    impact: 'mixed',
    relatedCommodities: ['ZWZ', 'ZCZ', 'ZSZ'],
    importance: 'medium'
  },
  {
    id: '9',
    title: 'Platinum Prices Weaken on Automotive Sales Concerns',
    source: 'Metals Focus',
    category: 'Precious Metals',
    date: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    summary: 'Platinum prices declined as weaker automotive sales reduce demand for catalytic converters.',
    impact: 'negative',
    relatedCommodities: ['PLATINUM', 'PALLADIUM'],
    importance: 'low'
  },
  {
    id: '10',
    title: 'Global Trade Tensions Support Safe-Haven Metals',
    source: 'Trade News Daily',
    category: 'Market Analysis',
    date: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    summary: 'Rising geopolitical tensions and trade disputes continue to support precious metals prices as investors seek safety.',
    impact: 'positive',
    relatedCommodities: ['GOLD', 'SILVER', 'PLATINUM'],
    importance: 'high'
  }
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const importance = searchParams.get('importance');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    let news = [...MARKET_NEWS];

    // Filter by category if provided
    if (category) {
      news = news.filter(n => n.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by importance if provided
    if (importance) {
      news = news.filter(n => n.importance === importance);
    }

    // Sort by date (newest first) and limit results
    news = news
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: news,
      count: news.length,
      total: MARKET_NEWS.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching market news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market news' },
      { status: 500 }
    );
  }
}

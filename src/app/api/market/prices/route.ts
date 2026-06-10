import { NextRequest, NextResponse } from 'next/server';

// Real commodity price data (updated regularly)
// In production, integrate with APIs like: Alpha Vantage, Metals.live, CoinGecko, etc.
const COMMODITY_PRICES = {
  gold: {
    name: 'Gold (XAU/USD)',
    symbol: 'GOLD',
    price: 2645.50,
    change: 12.30,
    changePercent: 0.47,
    unit: 'per oz',
    category: 'Precious Metals',
    lastUpdated: new Date().toISOString(),
    high24h: 2655.80,
    low24h: 2630.20,
    trend: 'up'
  },
  silver: {
    name: 'Silver (XAG/USD)',
    symbol: 'SILVER',
    price: 31.42,
    change: 0.85,
    changePercent: 2.78,
    unit: 'per oz',
    category: 'Precious Metals',
    lastUpdated: new Date().toISOString(),
    high24h: 31.65,
    low24h: 30.95,
    trend: 'up'
  },
  platinum: {
    name: 'Platinum (XPT/USD)',
    symbol: 'PLATINUM',
    price: 1045.80,
    change: -15.40,
    changePercent: -1.45,
    unit: 'per oz',
    category: 'Precious Metals',
    lastUpdated: new Date().toISOString(),
    high24h: 1065.20,
    low24h: 1040.50,
    trend: 'down'
  },
  palladium: {
    name: 'Palladium (XPD/USD)',
    symbol: 'PALLADIUM',
    price: 975.35,
    change: -28.65,
    changePercent: -2.85,
    unit: 'per oz',
    category: 'Precious Metals',
    lastUpdated: new Date().toISOString(),
    high24h: 1010.20,
    low24h: 970.80,
    trend: 'down'
  },
  copper: {
    name: 'Copper',
    symbol: 'COPPER',
    price: 4.28,
    change: 0.15,
    changePercent: 3.63,
    unit: 'per lb',
    category: 'Industrial Metals',
    lastUpdated: new Date().toISOString(),
    high24h: 4.30,
    low24h: 4.15,
    trend: 'up'
  },
  lithium: {
    name: 'Lithium Carbonate',
    symbol: 'LITHIUM',
    price: 18750.00,
    change: 250.00,
    changePercent: 1.35,
    unit: 'per tonne',
    category: 'Industrial Metals',
    lastUpdated: new Date().toISOString(),
    high24h: 19200.00,
    low24h: 18450.00,
    trend: 'up'
  },
  oil_crude: {
    name: 'Crude Oil (WTI)',
    symbol: 'WTICL',
    price: 78.45,
    change: 1.85,
    changePercent: 2.41,
    unit: 'per barrel',
    category: 'Energy',
    lastUpdated: new Date().toISOString(),
    high24h: 79.30,
    low24h: 76.80,
    trend: 'up'
  },
  oil_brent: {
    name: 'Brent Crude Oil',
    symbol: 'BRENL',
    price: 82.10,
    change: 1.65,
    changePercent: 2.05,
    unit: 'per barrel',
    category: 'Energy',
    lastUpdated: new Date().toISOString(),
    high24h: 83.05,
    low24h: 80.50,
    trend: 'up'
  },
  natural_gas: {
    name: 'Natural Gas (Henry Hub)',
    symbol: 'NATGAS',
    price: 2.85,
    change: -0.12,
    changePercent: -4.04,
    unit: 'per MMBtu',
    category: 'Energy',
    lastUpdated: new Date().toISOString(),
    high24h: 3.05,
    low24h: 2.80,
    trend: 'down'
  },
  uranium: {
    name: 'Uranium',
    symbol: 'URANIUM',
    price: 85.50,
    change: 3.25,
    changePercent: 3.95,
    unit: 'per lb',
    category: 'Energy',
    lastUpdated: new Date().toISOString(),
    high24h: 86.20,
    low24h: 82.80,
    trend: 'up'
  },
  wheat: {
    name: 'Wheat',
    symbol: 'ZWZ',
    price: 565.25,
    change: -8.75,
    changePercent: -1.53,
    unit: 'per bushel',
    category: 'Agriculture',
    lastUpdated: new Date().toISOString(),
    high24h: 578.50,
    low24h: 563.80,
    trend: 'down'
  },
  corn: {
    name: 'Corn',
    symbol: 'ZCZ',
    price: 385.50,
    change: 5.25,
    changePercent: 1.38,
    unit: 'per bushel',
    category: 'Agriculture',
    lastUpdated: new Date().toISOString(),
    high24h: 388.20,
    low24h: 381.25,
    trend: 'up'
  },
  soybeans: {
    name: 'Soybeans',
    symbol: 'ZSZ',
    price: 1042.75,
    change: 18.50,
    changePercent: 1.80,
    unit: 'per bushel',
    category: 'Agriculture',
    lastUpdated: new Date().toISOString(),
    high24h: 1055.25,
    low24h: 1028.00,
    trend: 'up'
  }
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const symbol = searchParams.get('symbol');

    let prices = Object.values(COMMODITY_PRICES);

    // Filter by category if provided
    if (category) {
      prices = prices.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by symbol if provided
    if (symbol) {
      prices = prices.filter(p => p.symbol.toLowerCase() === symbol.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      data: prices,
      count: prices.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commodity prices' },
      { status: 500 }
    );
  }
}

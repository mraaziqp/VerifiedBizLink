import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // OpenTelemetry (pulled in transitively by genkit, used for /api/chat) uses
    // dynamic `require(expr)` internally for optional instrumentation plugins.
    // Webpack can't statically analyze that, so it warns on every build even
    // though the code path is never exercised — this is a widely-known,
    // harmless warning upstream (open-telemetry/opentelemetry-js#4638).
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@opentelemetry\/instrumentation/, message: /Critical dependency/ },
      { module: /node_modules\/@protobufjs\/inquire/, message: /Critical dependency/ },
    ];
    return config;
  },
  images: {
    // Optimised images are cached at Amplify's CloudFront edge; a longer
    // TTL and modern formats mean fewer trips to the SSR compute to re-resize.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
      {
        source: '/icon-192.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      {
        source: '/icon-512.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

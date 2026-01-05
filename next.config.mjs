/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    unoptimized: true,
  },
  // Webpack config to skip type checking
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    // Ignore specific files that might cause issues
    config.module.rules.push({
      test: /\.csv$/,
      type: 'asset/resource',
    });
    
    return config;
  },
  // Server-side rendering for API routes
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    typedRoutes: false,
    // Disable turbopack for now to use standard webpack
    turbo: {
      resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },
  },
  // Fix hot reload issues
  watchOptions: {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/scripts/**',
      '**/generated-audio/**',
      '**/azure-audio/**',
      '**/verb-audio-full/**',
      '**/*.csv',
      '**/*.json',
    ],
  },
  // Force webpack instead of turbopack during development
  swcMinify: false,
}

export default nextConfig

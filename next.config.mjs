/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true'

const nextConfig = {
  ...(isCapacitorBuild && { output: 'export' }),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors now fail the build — tsc is clean, so this is the safety net
    // that catches the kind of inconsistency the API-auth audit surfaced.
    ignoreBuildErrors: false,
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
      };
    }
    return config;
  },
  // Server-side rendering for API routes
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    typedRoutes: false,
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
}

export default nextConfig

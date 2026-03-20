/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    '/*': [
      './prisma/**',
      './node_modules/.prisma/client/**',
      './node_modules/@prisma/client/**',
    ],
  },
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev) {
      const ignored = [
        '**/.next/**',
        '**/.next-user/**',
        '**/.next-agent/**',
        '**/node_modules/.vite/**',
        '**/logs/**',
        '**/prisma/dev.db',
        '**/prisma/dev.db-journal',
        '**/prisma/dev.db-wal',
        '**/prisma/dev.db-shm',
        '**/prisma/test.db',
        '**/prisma/test.db-journal',
        '**/prisma/test.db-wal',
        '**/prisma/test.db-shm',
      ];
      const current = config.watchOptions?.ignored;
      if (Array.isArray(current)) {
        config.watchOptions = {
          ...config.watchOptions,
          ignored: [...current, ...ignored],
        };
      } else {
        config.watchOptions = {
          ...(config.watchOptions || {}),
          ignored,
        };
      }
    }
    return config;
  },
};

module.exports = nextConfig;

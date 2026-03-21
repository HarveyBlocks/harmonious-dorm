const path = require('node:path');

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

function sqliteWatchIgnorePatterns() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.startsWith('file:')) return [];
  const rawPath = dbUrl.slice('file:'.length).split('?')[0];
  if (!rawPath || rawPath === ':memory:') return [];

  const cleanRawPath = rawPath.replace(/^\.?[\\/]/, '');
  const absCandidates = new Set([
    path.resolve(__dirname, rawPath),
    path.resolve(__dirname, 'prisma', cleanRawPath),
  ]);
  const suffixes = ['', '-journal', '-wal', '-shm'];
  const patterns = [];

  for (const absPath of absCandidates) {
    const rel = path.relative(__dirname, absPath);
    if (!rel || rel.startsWith('..')) continue;
    const relPosix = toPosix(rel);
    for (const suffix of suffixes) {
      patterns.push(`**/${relPosix}${suffix}`);
    }
  }
  return [...new Set(patterns)];
}

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
      const distDir = process.env.NEXT_DIST_DIR || '.next';
      const ignored = [
        '**/node_modules/**',
        `**/${toPosix(distDir)}/**`,
        '**/.next/**',
        '**/node_modules/.vite/**',
        '**/.tmp/**',
        '**/logs/**',
        ...sqliteWatchIgnorePatterns(),
      ];
      const current = config.watchOptions?.ignored;
      if (Array.isArray(current)) {
        const stringCurrent = current.filter((item) => typeof item === 'string' && item.trim().length > 0);
        config.watchOptions = {
          ...config.watchOptions,
          ignored: [...stringCurrent, ...ignored],
        };
      } else if (typeof current === 'string' && current.trim().length > 0) {
        config.watchOptions = {
          ...(config.watchOptions || {}),
          ignored: [current, ...ignored],
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

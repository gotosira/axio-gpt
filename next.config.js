/** @type {import('next').NextConfig} */
const isGhPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'axio-gpt';

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  eslint: {
    // Allow builds to succeed on Vercel even if lint warnings/errors exist
    ignoreDuringBuilds: true,
  },
  // When building for GitHub Pages, emit a fully static export into ./out
  ...(isGhPages
    ? {
        output: 'export',
        trailingSlash: true,
        assetPrefix: `/${repoName}/`,
        basePath: `/${repoName}`,
      }
    : {}),
  images: {
    ...(isGhPages ? { unoptimized: true } : {}),
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;



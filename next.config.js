/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'mjml',
    'mjml-core',
    'mjml-cli',
    'mjml-migrate',
    'mjml-preset-core',
    'mjml-validator',
    'juice',
    'cheerio',
    'uglify-js',
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;


/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // 🚀 Optimisations de performance
  experimental: {
    optimizePackageImports: ['lucide-react'], // Tree shaking pour lucide-react
  },

  // 📊 Pour analyser les bundles, utilisez: ANALYZE=true npm run build
  webpack: (config, { isServer }) => {
    // Hot reload dans Docker
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };

    // Analyse des bundles (uniquement si ANALYZE=true)
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
          openAnalyzer: false,
        })
      );
    }

    return config;
  },

  // 🎯 Optimisations supplémentaires
  compress: true, // Compression Gzip
  poweredByHeader: false, // Masquer le header X-Powered-By
};

module.exports = nextConfig;

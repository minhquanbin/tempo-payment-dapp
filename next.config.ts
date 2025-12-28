/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization for pages using XMTP
  experimental: {
    optimizePackageImports: ['@xmtp/xmtp-js']
  },
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // Externalize WASM files on server side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@xmtp/user-preferences-bindings-wasm': 'commonjs @xmtp/user-preferences-bindings-wasm',
        '@xmtp/mls-bindings-wasm': 'commonjs @xmtp/mls-bindings-wasm',
      });
    }

    return config;
  },
};

module.exports = nextConfig;
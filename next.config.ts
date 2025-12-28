/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cấu hình Turbopack rỗng để Next.js biết bạn đã xem xét nó
  turbopack: {},
  
  experimental: {
    optimizePackageImports: ['@xmtp/xmtp-js']
  },
  
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Xử lý file WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // Externalize WASM files ở phía server
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

export default nextConfig;
import path from "node:path"

/** @type {import('next').NextConfig} */

const nextConfig = {
  turbopack: {
    resolveAlias: {
      module: "./lib/pdf/module-stub.ts",
    },
  },

  output: "standalone",

  experimental: {
    serverActions: {
      bodySizeLimit: "105mb",
    },

    // Only needed if your upload request passes through proxy.ts
    proxyClientMaxBodySize: "105mb",
  },

  webpack(config) {
    config.resolve = config.resolve ?? {}

    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      module: path.resolve("./lib/pdf/module-stub.ts"),
    }

    return config
  },

  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig

import path from "node:path"

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      module: "./lib/pdf/module-stub.ts",
    },
  },
  output: "standalone",
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

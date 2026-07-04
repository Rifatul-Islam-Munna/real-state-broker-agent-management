/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      module: "./lib/pdf/module-stub.ts",
    },
  },
}

export default nextConfig

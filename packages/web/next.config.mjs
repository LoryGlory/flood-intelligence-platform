/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile our workspace packages (they ship TypeScript source in dev)
  transpilePackages: [
    "@flood/core",
    "@flood/ingestion",
    "@flood/risk-engine",
    "@flood/evidence-store",
    "@flood/llm-agent",
  ],
};

export default nextConfig;

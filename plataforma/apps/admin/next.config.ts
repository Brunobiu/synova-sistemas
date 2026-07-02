import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes internos do monorepo consumidos como código-fonte TS.
  transpilePackages: [
    "@synova/ai",
    "@synova/database",
    "@synova/shared",
    "@synova/ui",
  ],
};

export default nextConfig;

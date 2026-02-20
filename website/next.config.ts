import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // In Vercel monorepo builds, tracing root is the repository root.
    // Keep Turbopack root aligned to avoid config mismatch warnings.
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;

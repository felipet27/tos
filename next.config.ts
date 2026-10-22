import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The default optimizer relies on sharp, which does not run on Workers
    unoptimized: true,
  },
};

export default nextConfig;

// Enables the Cloudflare bindings during `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

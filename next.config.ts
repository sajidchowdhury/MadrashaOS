import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the sandbox preview proxy host so Next.js doesn't log
  // cross-origin warnings when the browser loads pages through it.
  allowedDevOrigins: [
    "https://*.space-z.ai",
    "https://*.chatglm.cn",
    "http://172.22.176.1:3000",
  ],
  // The preview proxy cannot forward WebSocket connections, so the
  // default HMR (Hot Module Replacement) transport produces a flood of
  // "WebSocket connection failed" console errors. Disabling HMR means
  // the browser won't auto-reload on file changes — just refresh manually.
  // This is acceptable in the sandbox since the dev server restarts
  // quickly and the preview panel refreshes on focus.
  devIndicators: false,
};

export default nextConfig;

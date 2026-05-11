import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Pin trace root to this folder — there's a stray lockfile higher up that
  // Next would otherwise infer as the workspace root.
  outputFileTracingRoot: path.resolve(__dirname),
};

export default config;

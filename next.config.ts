import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["firebase-admin"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

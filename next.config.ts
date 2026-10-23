import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Load with Node's require: resvg is a native addon, and svg-captcha reads
  // its font file relative to its own directory.
  serverExternalPackages: ['@resvg/resvg-js', 'svg-captcha'],
};

export default nextConfig;

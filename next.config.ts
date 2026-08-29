import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "microsoft-cognitiveservices-speech-sdk",
    "ffmpeg-static",
  ],
  outputFileTracingIncludes: {
    "/api/assess": ["./node_modules/ffmpeg-static/**/*"],
  },
};

export default nextConfig;

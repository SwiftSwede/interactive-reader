import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "microsoft-cognitiveservices-speech-sdk",
    "ffmpeg-static",
  ],
  outputFileTracingIncludes: {
    "/api/assess": ["./node_modules/ffmpeg-static/**/*"],
  },
  async redirects() {
    return [
      {
        source: "/story/:slug",
        destination: "/lesson/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

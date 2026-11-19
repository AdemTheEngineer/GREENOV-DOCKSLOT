import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  transpilePackages: ["@dockslot/shared"],
  // Linting runs once for the whole monorepo with `npm run lint`.
  eslint: { ignoreDuringBuilds: true },
  // The browser only talks to this origin: no CORS, and the auth cookie stays first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;

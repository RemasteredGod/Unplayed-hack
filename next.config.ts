import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['three'],
  // Next 16 writes AGENTS.md / CLAUDE.md into the repo root on `next dev`.
  agentRules: false,
};

export default nextConfig;

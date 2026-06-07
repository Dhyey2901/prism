import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PPR (Partial Prerendering) intentionally NOT enabled.
  // CVE-2025-59472: unbounded memory DoS via PPR resume endpoint — not applicable
  // as long as experimental.ppr remains unset. Monitor for upstream patch.
};

export default nextConfig;

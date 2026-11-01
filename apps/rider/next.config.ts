import { networkInterfaces } from 'node:os';
import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

/** This computer's private network address, Wi-Fi first (virtual adapters skipped). */
function lanAddress(): string | undefined {
  const adapters = Object.entries(networkInterfaces())
    .filter(([name]) => !/virtual|vmware|vethernet|wsl|bluetooth/i.test(name))
    .sort(([a], [b]) => Number(/wi-?fi|wlan/i.test(b)) - Number(/wi-?fi|wlan/i.test(a)));
  return adapters
    .flatMap(([, addresses]) => addresses ?? [])
    .find(({ family, address }) => family === 'IPv4' && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address))?.address;
}

export default function config(phase: string): NextConfig {
  const lan = phase === PHASE_DEVELOPMENT_SERVER ? lanAddress() : undefined;
  return {
    reactStrictMode: true,
    devIndicators: false,
    transpilePackages: ['@restaurant-saas/shared'],
    // Next.js blocks its dev files on any address but localhost; a phone on the same Wi-Fi uses this one.
    allowedDevOrigins: lan ? [lan] : [],
  };
}

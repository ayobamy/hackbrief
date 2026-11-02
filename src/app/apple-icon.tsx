import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand-tokens";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon for iOS: the mark on a full square, which iOS rounds itself. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: BRAND.ink }}>
        <svg width="180" height="180" viewBox="0 0 32 32">
          <rect width="32" height="32" fill={BRAND.ink} />
          <path d="M8.5 7.5V24.5M8.5 17.6c0-3.1 2.1-5.2 5-5.2s5 2.1 5 5.2v6.9" fill="none" stroke={BRAND.paper} strokeWidth="3.6" />
          <rect x="22" y="17.6" width="3.2" height="6.9" fill={BRAND.accent} />
        </svg>
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand-tokens";

export const alt = "hackr: pick the right hackathon, then play to win.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The card shown when a hackr link is shared: the mark, the name and the promise. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: BRAND.paper,
          color: BRAND.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill={BRAND.ink} />
            <path d="M8.5 7.5V24.5M8.5 17.6c0-3.1 2.1-5.2 5-5.2s5 2.1 5 5.2v6.9" fill="none" stroke={BRAND.paper} strokeWidth="3.6" />
            <rect x="22" y="17.6" width="3.2" height="6.9" fill={BRAND.accent} />
          </svg>
          <span style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em" }}>hackr</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 84, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1 }}>
          <span>Pick the right hackathon.</span>
          <span style={{ color: BRAND.muted }}>Then play to win.</span>
        </div>
        <div style={{ display: "flex", height: 8, width: 160, background: BRAND.accent }} />
      </div>
    ),
    size,
  );
}

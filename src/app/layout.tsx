import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import "./globals.css";

// The type of a printed brief (docs/brand.md): a serif for headings and figures, with its optical
// sizes so large text is drawn for large sizes; a plain sans for running text; a mono for labels and
// the pasted rules.
const serif = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const sans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Vercel sets the production domain; locally, links in shared cards point at the dev server.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "hackbrief: pick the right hackathon, then play to win", template: "%s · hackbrief" },
  description:
    "A hackathon finder and coach: upcoming hackathons from sources that allow it, and any event's rules turned into a plan. Open source.",
  openGraph: { siteName: "hackbrief", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}

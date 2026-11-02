# Brand

hackbrief's logo, colours and type, and how to use them. Added in issue #17.

## The logo

![The hackbrief mark](../public/logo-mark.svg)

The mark is a bold lowercase "h" in a rounded ink square, with an orange block beside it like a
typing cursor: hacking, and the next move. Beside the wordmark "hackbrief" it forms the logo.

| File | Use |
| --- | --- |
| `src/components/logo.tsx` | `LogoMark` and `Logo` (mark and wordmark) in the app; they follow the light and dark themes |
| `src/app/icon.svg` | The favicon, in fixed colours so it reads on any browser tab |
| `src/app/apple-icon.tsx` | The 180 × 180 home-screen icon, generated at build time |
| `src/app/opengraph-image.tsx` | The 1200 × 630 card shown when a link is shared |
| `public/logo-mark.svg` | The mark on its own, for the README and anywhere outside the app |

Keep clear space around the mark of at least a quarter of its width. Do not recolour, stretch,
outline or rotate it, and do not put it on a busy image.

## Colours

The values live in `src/app/theme.css`, the one place raw colours are allowed; components use the
tokens (`bg-paper`, `text-ink`, `text-muted`, `border-line`, `bg-panel`, `bg-accent`).

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `paper` | `#fafaf7` | `#0c0c0b` | Page background |
| `ink` | `#111110` | `#f2f1ec` | Text, primary buttons, the mark's square |
| `muted` | `#5c5b57` | `#a3a29c` | Secondary text; at least 4.5:1 against paper |
| `line` | `#e4e2dc` | `#262624` | Borders, dividers, the dot grid |
| `panel` | `#ffffff` | `#151514` | Cards |
| `accent` | `#f0531c` | `#ff6a33` | The cursor block, weight bars and small marks only, never body text: it does not reach 4.5:1 |

`src/lib/brand-tokens.ts` repeats the light values for the generated images, which cannot read CSS
variables; change both together.

## Type and layout

hackbrief is set like a printed brief (issue #29), not like a generic web app.

- **Newsreader** (serif, with optical sizes) for headings, figures and key facts such as a
  deadline or a weight. Medium weight, close to normal tracking; the second line of the hero is
  italic.
- **IBM Plex Sans** for running text and controls.
- **IBM Plex Mono** for small upper-case labels, tags, footnote numbers and pasted rules.

All three are under the SIL Open Font License, loaded with `next/font`. Headings get the serif from
one base rule in `src/app/globals.css`.

Panels are flat sheets with square corners and hairline borders, built from `src/components/sheet.tsx`:
no shadows, rounded cards, pills, dotted canvases or glows. Lists use dotted leaders between a name
and its figure, and bars are two pixels of ink. Orange is used only as highlighter ink (marked lines
of the rules, the tab underline, the selected time label), never for text. Footnote numbers tie each
highlighted line of the rules to its part of the brief.

Motion stays small and optional: lines rise in, bars grow, and the coach reads through a sample once.
All of it stops under `prefers-reduced-motion`.

## Voice

Plain and specific. Show only what works today, with numbers the code computes; no invented users,
logos, ratings or testimonials. Say where data comes from.

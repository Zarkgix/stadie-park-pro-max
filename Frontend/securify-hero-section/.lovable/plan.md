
## Goal

Build a frontend-only (no backend wiring yet) for the stadium traffic monitoring project, branded as **securify**, using the exact hero spec you provided. The same dark theme — black background, white text, neutral-900/90 pills, Readex Pro typography, hero-title letter-spacing — carries across every page (login, dashboard, AI support, etc.).

## Pages & Routes (TanStack Start, file-based)

```
src/routes/
  __root.tsx              shared shell, fonts, meta
  index.tsx               hero landing (exact spec below)
  login.tsx               sign-in form, themed
  register.tsx            vehicle registration form
  dashboard.tsx           live queue + parking usage
  queue.tsx               full priority queue table
  parking.tsx             parking spot allocation grid
  payment.tsx             simulated NFC contactless payment
  ai-support.tsx          local LLM chat assistant UI
  reports.tsx             simulation summaries / stats
```

Every non-landing page reuses a shared `<AppNavbar />` (same floating pill style as the hero) and a `<PageShell />` wrapper for consistent black background + Readex Pro.

## Hero (src/routes/index.tsx) — exact to spec

- `<section class="relative h-screen w-full overflow-hidden bg-black">`
- Looping muted background `<video>` with the provided CloudFront mp4
- Floating navbar (absolute, z-20):
  - Left pill: custom 256×256 SVG logo (the 4-quadrant path you specified) + "securify"
  - Center pill (md+): platform · solutions · company · support
  - Right: "get started" white pill button
- Foreground:
  - Three staggered headlines "protect" / "your" / "data" using `.hero-title` (`letter-spacing:-0.04em; line-height:.95`) at the exact positions and `text-[14vw] md:text-[13vw]`
  - Description paragraph at left top-46% with the exact copy
  - Three stat blocks (+65k startups use, +1.5b gb data was protected, +300k downloads) with rotated `h-px w-24 bg-white/40` dividers
  - Bottom-to-black gradient overlay
- All lowercase, only allowed transitions, no purple/indigo.

## Global Styles (src/styles.css additions)

- `@import url("https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&display=swap")`
- `html, body, #root { height:100% }`
- `body { font-family:'Readex Pro', system-ui, -apple-system, sans-serif; background:#000; color:#fff; -webkit-font-smoothing:antialiased }`
- `.hero-title { letter-spacing:-0.04em; line-height:0.95 }`
- Keep semantic Tailwind tokens but override `--background` to pure black and `--foreground` to white so shadcn components inherit the dark theme cleanly.

## Other Pages — themed consistently

- **Login / Register**: centered card, `bg-neutral-900/90 backdrop-blur rounded-2xl`, white inputs with `bg-neutral-800 border-white/10`, white pill submit button matching hero CTA. Lowercase labels.
- **Dashboard**: top floating pill navbar, grid of stat cards (same `+65k` style typography), live queue preview, parking occupancy donut placeholder.
- **Queue**: priority-sorted table (vehicle type, urgency, wait time, score, status) on neutral-900 surfaces.
- **Parking**: visual grid of parking slots, white = free, neutral-700 = occupied, accent ring for newly allocated.
- **Payment**: simulated NFC tap screen — large pulsing white circle, "tap to pay" lowercase, success state.
- **AI Support**: chat layout with neutral-900 message bubbles for user, transparent bordered bubbles for assistant; input pill at bottom; placeholder for local Ollama/Qwen wiring later.
- **Reports**: large hero-title style numbers with rotated dividers, mirroring the landing stat aesthetic.

All pages: black bg, Readex Pro, neutral-900/90 pills, white/40–white/90 opacity scale, no purple, lowercase headings.

## Reusable Components

```
src/components/
  brand/Logo.tsx          the 256×256 SVG path
  layout/AppNavbar.tsx    floating pill navbar (used on all non-hero routes too)
  layout/PageShell.tsx    black bg + padded container
  ui-ext/StatBlock.tsx    number + rotated divider + sublabel
  ui-ext/PillButton.tsx   white & neutral-900 pill variants
```

## Out of Scope (this turn)

- No backend, no Lovable Cloud, no auth logic, no real LLM calls — forms and chat are UI-only with local state, ready to wire later as you said.

## Technical Notes

- TanStack Start file-based routes; create each route file so `<Link>` typing passes.
- Background video served from the provided CloudFront URL; `playsInline` + `muted` for autoplay on iOS.
- shadcn components retained but restyled via token overrides — no per-component color hardcoding outside the hero spec strings you dictated.
- Responsive: navbar center pill hidden on mobile, dividers hidden on mobile, headline sizes via vw as specified.

Approve and I'll implement.

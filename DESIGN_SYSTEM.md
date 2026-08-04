# EXECUTIA DESIGN SYSTEM

## Visual identity

EXECUTIA uses two complementary surfaces:

1. **ENTRY** — dark-neutral introduction to the Execution Standard
2. **Institutional product pages** (Engine, ONE, Pilot, docs) — light institutional interface (unchanged until a separate migration)

ENTRY is a category introduction, not a SaaS marketing surface.

---

## ENTRY (dark-neutral)

Scoped under `body[data-page="entry"]` via `/assets/entry-landing.css`.

### Backgrounds
- Page: `#0c1220`
- Elevated: `#131b2c`
- Soft band: `#101828`
- Avoid flat `#000` and generic near-black SaaS gradients

### Color
- Ink: `#e8eef7`
- Soft ink: `#c5d0e0`
- Muted: `#8b9bb0`
- Line: `rgba(200, 214, 232, 0.12)`
- Accent: `#9eb6d4` (restrained cool steel — no purple glow)

### Typography
- Display: Outfit
- Body: Source Sans 3
- Hero H1: large, weight 500, tight tracking
- Section H2: ~32–50px / 500
- Navigation: quiet uppercase, compact

### UI rules (ENTRY)
- Large whitespace; one idea per section
- Cards only where a domain link needs a container
- Motion: subtle IntersectionObserver reveals; honor `prefers-reduced-motion`
- Glass only on sticky header

### Header (ENTRY)
`EXECUTIA™` + `Platform / Engine / LIFE / ONE / GOV / Development / Pilot` + `Request Pilot`

Anchors: Platform → `/#platform`, GOV → `/#gov`, Development → `/#development`  
Routes: Engine → `/engine`, ONE → `/one`, Pilot → `/pilot`, LIFE → `https://life.executia.io`

### Footer
Compact footer: Execution Standard tagline; Platform / Resources / Company columns including GOV and Development anchors.

### Section contract
`hero` → `problem` → `solution` → `platform` → `products` (`#life` `#one` `#gov`) → `engine` → `vision` → `development` → `pilot`

---

## Institutional pages (light — retained)

### Background rule
For Engine, ONE, Pilot, docs, and related institutional pages:
- `#ffffff`
- `#f6f9fd`
- `#eef5fb`

### Structural colors
- Primary ink: `#0f2d4a`
- Structural blue: `#1e3a5f`
- Muted text: `#6f8296`
- Border: `#e3ebf3`
- Status green: `#18704f`
- Risk red: `#9a3e3e`

### Typography
- Font: Inter (institutional pages)
- Hero H1: 48–78px / 600
- Section H2: 26–34px / 500
- Body: 15–18px / 400
- Navigation: 11px / uppercase / quiet
- Footer: 12px / compact

### UI rules
- Radius: 12px
- Cards: light border, minimal shadow
- Buttons: pill CTA, controlled size
- Header and footer are part of the EXECUTIA protocol, not decoration

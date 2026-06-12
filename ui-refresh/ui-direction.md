# SfRB UI/UX Direction — steering list

## North star
Make it *feel* like a calm, modern, design-tool-grade local app: the **page is the hero**, chrome recedes, every interaction has crisp feedback, and the default output looks like something you'd actually send. Right now the backend is trustworthy but the surface reads as a debug harness, dense labels, flat gray panels, no motion, and a Times New Roman page.

---

## A. Typography & visual identity `P0`
The single biggest "feels like slop" lever. Split it in two, because they have different constraints:
- **Shell / UI chrome** (panels, lens switcher, labels, buttons): free to change today. Adopt one modern variable sans (Inter / Geist / IBM Plex Sans), a real type scale (e.g. 12/13/15/19/24), and consistent weights. Kill the ALL-CAPS micro-labels-as-headers look or make them a deliberate, smaller, letter-spaced eyebrow.
- **Resume / template type** (the page itself): templates *are* typography by contract, so the "gross" default is really the **default template + the pinned measurement serif**. Two viable moves: (1) ship a genuinely beautiful default template (refined serif/sans pairing, proper leading, tracking) and make it the init default, and/or (2) retune the overflow-measurement baseline off Times New Roman, a scoped, test-aware task (see constraints).

## B. Reduce text & cognitive load `P0`
The shell over-explains. Onboarding copy is living permanently in the UI.
- Trim the verbose lens descriptions ("Rewrite the actual words…", "Move, split, and group placed blocks…") to a word or two + a tooltip/hover.
- Collapse the interaction HUD (`INTERACTION MODE / SELECTED BLOCK / SELECTED FRAME / DRAG AFFORDANCES / SELECTED FRAME BOX`) into a compact status strip or the inspector. Show detail on selection, not always.
- Fix broken/awkward copy surfaced live: Freeform helper "…leaving it reconciles your placements explicitly" reads like a merge artifact.
- Make the right rail (save state / AI / overflow / template / export) a tidy, scannable sidebar with icons + short labels, not stacked paragraphs.

## C. Motion & feedback `P0`
Nothing animates, so nothing feels alive or "quality."
- Lens switch: subtle crossfade / slide instead of an instant swap.
- Selection, hover, focus: smooth outline/elevation transitions on frames and buttons.
- Drag/resize: snappy transform feedback, drop settle, and (B/F lenses) alignment/snap guides.
- State changes: save-state pulse, overflow badge transition, toast or inline confirm on commit, ghost-preview fade for AI proposals.
- Always gate behind `prefers-reduced-motion`.

## D. Canvas as a real design surface `P1`
Live issues: fixed 612px page bleeds into the right rail at narrow widths; big empty page tail; "Select a tile to split…" clipped at the canvas edge; cryptic corner handle that overlaps the first bullet line.
- Responsive canvas: fit-to-width scaling + explicit zoom controls (50/100/fit), centered page, scroll/pan.
- Proper page framing: paper shadow, margin guides, page-edge ruler; graceful empty-space treatment instead of a barren grid.
- Refine manipulation affordances toward a Figma-like feel: subtle handles that never overlap content, snap/align guides, marquee select.

## E. Color, depth & a small component kit `P1`
- Establish design tokens: color, spacing, radius, shadow, type scale (the system overview's own palette — ink/paper/accent/good/warn/bad — is a great starting point and already cohesive).
- Add restrained depth (soft shadows, 1px hairlines) so panels read as layered, not flat gray boxes.
- Build a tiny shared component set: segmented "pill" lens switcher (the mockup in the HTML already shows the nicer version), buttons, badges, status chips, collapsible inspector, dialog. Reuse instead of ad-hoc styles.
- Consider an optional dark mode once tokens exist.

## F. Onboarding & empty states `P2`
- Replace permanent inline explainer text with a dismissible first-run guide / contextual tooltips / a help affordance.
- Design real empty/skipped states (e.g. AI "skipped", no selection, fresh workspace) so they look intentional, not unfinished.

## G. Export / preview polish `P2`
- Make the print/preview surface look like real paper (shadow, centered, zoomable) and present ready/risk/blocked status as a clear, confident banner, not sparse text.
- Keep editor affordances strictly out of the artifact path (already a contract).

---

## Hard constraints the mission must respect
- **Frozen selectors**: every `id` / `data-testid` used by `tests/` and `scripts/verify-*.mjs` may be *restyled and relocated freely* but never renamed or dropped.
- **Times New Roman is a measurement baseline**, not just an aesthetic choice: overflow tests + smokes are tuned to its metrics. Changing the canvas/measurement font is allowed but is a deliberate task that must retune the overflow suite (`tests/web/editor-layout-consultant.test.ts` and the smokes). Template fonts are safer to change than the measurement baseline.
- **Byte-stability**: the `default` template's print output has a byte-stability test; print-surface visual changes must keep it stable or update the snapshot intentionally.
- **WCAG AA contrast gate**: any new color/template must pass the 4.5:1 text-vs-page test.
- **Don't touch the write path**: this is pure UI/UX — no changes to operations, bridge routes, schema, or CLI parity.
- **Accessibility already shipped** (radiogroup lens switcher, aria-live save state, focus-trapped dialog, keyboard canvas): preserve it; motion must honor `prefers-reduced-motion`.

---

## Suggested priority for the mission
A + B + C first (typography, declutter, motion) deliver ~80% of the perceived-quality jump; D/E next; F/G as polish.

---

## Companion reference
`sfrb-system-overview.html` (in this directory) is the full system overview — architecture, document model, the 13-operation vocabulary, the three lenses, reconciliation, AI consultant, a11y, security, testing, and known limitations. Use it alongside this list to scope the redesign mission without breaking backend contracts.

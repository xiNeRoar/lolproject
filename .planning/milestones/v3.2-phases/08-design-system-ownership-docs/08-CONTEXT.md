# Phase 8: Design System & Ownership Docs - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Formalize the existing implicit design system into docs/DESIGN_GUIDE.md, update CLAUDE.md ownership section for full-stack Claude ownership, and update PROJECT.md to reflect new ownership model. Documentation only — no code changes to the application.

</domain>

<decisions>
## Implementation Decisions

### Design Guide Depth
- **D-01:** Token reference + principles level. Document color tokens, typography, spacing, radius as reference tables. Add component usage principles (when to use Card vs Dialog, layout grid conventions, dark-only theme). Do NOT write per-component usage examples — shadcn docs already cover that.
- **D-02:** Include 5-8 do/don't rules as core guardrails. Examples: "Don't use alert for confirmations — use Dialog", "Don't write custom buttons — use shadcn Button variants". These help Claude align style and avoid common mistakes when implementing frontend.

### New Pattern Specifications
- **D-03:** Concept + data contract level for each new pattern. Describe what data each pattern shows, which tokens/components to use, approximate layout, and data source. Do NOT produce wireframes or pixel-level specs.
- **D-04:** Three new patterns to specify:
  - **Per-team career card:** Team name, role, W/L record, KDA averages. Uses Card component, muted-foreground for secondary text. Horizontal stack with team logo left. Data from per-team stats endpoint (Phase 5).
  - **Activity heatmap:** Match frequency over time (GitHub-style contribution graph). Primary color opacity scale for intensity. Grid layout, 52 weeks x 7 days. Data from player match history dates.
  - **Shareable card:** Compact card view optimized for screenshots. In-website "share" button that renders a compact view for user screenshots. No server-side OG image rendering — that's a future enhancement.

### Bot-Web Visual Alignment
- **D-05:** Add a "Bot Embed Alignment" section to the design guide. Document shared color palette principles, font choices, and consistency rules between bot PNG scoreboards (@napi-rs/canvas renderers) and website. Principles only — no bot code changes in this phase.

### Ownership Documentation
- **D-06:** Minimal update to CLAUDE.md — change ownership section so Claude owns `artifacts/vclol/src/` (was Replit), add reference to DESIGN_GUIDE.md as canonical design source. No other CLAUDE.md restructuring.
- **D-07:** Update PROJECT.md constraints and active requirements to reflect full-stack Claude ownership model.

### Claude's Discretion
- Exact do/don't rule selection (choose the 5-8 most impactful based on codebase analysis)
- Design guide document structure and section ordering
- Level of detail in bot-web alignment principles
- How to phrase ownership transition in PROJECT.md

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Tokens (source of truth)
- `artifacts/vclol/src/index.css` — All CSS custom properties: color roles (HSL), typography (Inter + Outfit), radius, scrollbar styling. Tailwind v4 `@theme inline` configuration.

### Component Library
- `artifacts/vclol/src/components/ui/` — ~50 shadcn/ui components (Card, Dialog, Button, Sheet, etc.). Standard CVA + clsx + tailwind-merge pattern.
- `artifacts/vclol/src/lib/utils.ts` — `cn()` utility (clsx + twMerge), `formatDate()` helper.

### Layout Patterns
- `artifacts/vclol/src/components/layout/PublicLayout.tsx` — Public page layout structure
- `artifacts/vclol/src/components/layout/AdminLayout.tsx` — Admin page layout structure

### Bot Renderers (for alignment section)
- `artifacts/discord-bot/src/lib/scoreboardRenderer.ts` — Scoreboard PNG rendering
- `artifacts/discord-bot/src/lib/` — Other `*Renderer.ts` files for player cards, leaderboards, team cards

### Ownership Docs (to update)
- `CLAUDE.md` §Ownership — Current ownership boundary definitions
- `.planning/PROJECT.md` §Constraints, §Context — Current ownership model and constraints

### Requirements
- `.planning/REQUIREMENTS.md` — DOC-01, DOC-02, DOC-03 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **~50 shadcn/ui components:** Full component library already in place — design guide documents usage principles, not component APIs
- **`cn()` utility:** Standard clsx + twMerge pattern for conditional class merging
- **Layout components:** PublicLayout and AdminLayout establish the two layout paradigms
- **Bracket components:** 5 tournament bracket types (SingleElimination, DoubleElimination, RoundRobin, Swiss, MatchList) — domain-specific components to reference in guide

### Established Patterns
- **Tailwind v4 CSS config:** No tailwind.config file — all tokens in `@theme inline` block in index.css
- **HSL color system:** All colors defined as HSL triplets with CSS custom properties
- **Dark-only theme:** No light mode — single dark theme (Dark Charcoal & Steel Blue)
- **Font pairing:** Inter (body, 400-600) + Outfit (display/headings, 500-800)
- **Hooks:** use-auth, use-mobile, use-toast — established hook patterns

### Integration Points
- **DESIGN_GUIDE.md → CLAUDE.md:** New doc referenced as canonical design source
- **DESIGN_GUIDE.md → downstream phases:** Future frontend implementation phases will read this guide
- **Per-team stats endpoint (Phase 5):** Career card pattern depends on this API existing

</code_context>

<specifics>
## Specific Ideas

- Activity heatmap should follow GitHub contribution graph style — familiar pattern for developers
- Shareable cards are screenshot-first, OG image generation is a future enhancement (separate phase)
- Bot-web alignment section covers principles only — no bot renderer code changes

</specifics>

<deferred>
## Deferred Ideas

- **OG image generation for shareable cards** — Requires server-side rendering infrastructure (API server doesn't have @napi-rs/canvas). Own phase.
- **Bot renderer visual refresh** — Updating bot embed colors/fonts to match website exactly. Depends on design guide existing first, but involves code changes beyond this doc phase.
- **CLAUDE.md full frontend refactor** — Adding frontend build commands, Tailwind v4 conventions, component patterns directly to CLAUDE.md. Decided against — DESIGN_GUIDE.md is the canonical source, CLAUDE.md just references it.

</deferred>

---

*Phase: 08-design-system-ownership-docs*
*Context gathered: 2026-03-28*

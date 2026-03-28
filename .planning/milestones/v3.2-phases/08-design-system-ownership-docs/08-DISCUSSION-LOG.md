# Phase 8: Design System & Ownership Docs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 08-design-system-ownership-docs
**Areas discussed:** Design guide depth, New pattern specs, Bot-web alignment, Ownership doc scope

---

## Design Guide Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Token reference + principles (Recommended) | Color tokens, typography, spacing, radius reference + component principles + layout patterns | ✓ |
| Complete component catalog | Per-component usage, props, dos/don'ts, code examples. Overlaps with shadcn docs. | |
| Minimal token dump | Just copy index.css tokens to markdown. Fast but least useful. | |

**User's choice:** Token reference + principles
**Notes:** None

### Follow-up: Do/Don't Rules

| Option | Description | Selected |
|--------|-------------|----------|
| Add 5-8 core rules | Do/don't pairs to align style and avoid common mistakes | ✓ |
| Skip | Tokens + principles already sufficient | |

**User's choice:** Add 5-8 core rules
**Notes:** None

---

## New Pattern Specifications

| Option | Description | Selected |
|--------|-------------|----------|
| Concept + data contract (Recommended) | Describe data, tokens, layout, data source per pattern. No wireframes. | ✓ |
| Detailed wireframe spec | Pixel-level layout, spacing, component tree structure. | |
| Just list names | One-line description, decide details at implementation time. | |

**User's choice:** Concept + data contract
**Notes:** None

### Follow-up: Shareable Cards Type

| Option | Description | Selected |
|--------|-------------|----------|
| OG image sharing | Server-side PNG for Twitter/Discord previews | |
| Screenshot-friendly UI | In-website compact card view for screenshots | |
| Both | OG image + screenshot UI | |

**User's choice:** Asked for Claude's recommendation
**Claude's recommendation:** Screenshot-friendly UI first. OG images require server-side rendering infrastructure the API server doesn't have. Deferred as future enhancement.

---

## Bot-Web Visual Alignment

| Option | Description | Selected |
|--------|-------------|----------|
| Add a section (Recommended) | "Bot Embed Alignment" section with shared palette, fonts, consistency principles. No code changes. | ✓ |
| Don't cover | Bot and website managed separately. | |
| Full alignment spec | Exact colors/fonts/spacing mapping between bot and website. | |

**User's choice:** Add a section
**Notes:** None

---

## Ownership Documentation Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal update (Recommended) | Change ownership section + add design guide reference. No restructuring. | ✓ |
| Medium refactor | Add frontend build commands, component conventions, Tailwind v4 info. | |
| Full rewrite | Comprehensive CLAUDE.md rewrite with full frontend coverage. | |

**User's choice:** Minimal update
**Notes:** User asked why minimal was recommended. Claude explained: (1) avoids duplication with DESIGN_GUIDE.md, (2) CLAUDE.md is a session reference not a style guide, (3) matches ROADMAP success criteria scope. User confirmed minimal update after understanding rationale.

---

## Claude's Discretion

- Exact do/don't rule selection (5-8 most impactful)
- Design guide document structure and section ordering
- Bot-web alignment principles detail level
- PROJECT.md ownership transition phrasing

## Deferred Ideas

- OG image generation for shareable cards — future phase
- Bot renderer visual refresh — depends on design guide, involves code changes
- CLAUDE.md full frontend refactor — DESIGN_GUIDE.md is canonical source instead

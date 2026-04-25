---
name: code-review
description: Review frontend and React code changes for correctness, regressions, security, accessibility, performance, and maintainability using industry standards and this Chrome extension repo conventions. Use when the user asks for review, PR feedback, or quality/risk assessment.
---

# Code Review (React + Frontend Standards)

## Mission
Provide senior-level code review feedback that is practical, risk-focused, and aligned with modern frontend and React engineering standards.

## Scope For This Repository
- Extension architecture: MV3 with `content`, `popup`, `background` surfaces.
- Priority review targets:
  - `src/content/content.tsx` (selectors, extraction, export logic)
  - `src/popup/popup.tsx` (UI interactions and message dispatch)
  - `src/background/background.ts` (runtime and lifecycle listeners)
  - `src/utils/browser.ts` (`chrome.*` API safety wrappers)
  - `public/manifest.json` (permissions and host surface)

## Review Output Format
1. Findings first, ordered by severity: Critical -> Major -> Minor.
2. Each finding should include:
   - What is wrong
   - Why it matters (risk or regression)
   - Suggested fix (concrete and minimal)
3. Add open questions/assumptions.
4. End with short residual risk + test gaps section.

## Non-Negotiable Review Standards

### Correctness + Reliability
- Check logic for edge cases, null/undefined access, async race conditions, stale state, and lifecycle bugs.
- Ensure behavior remains stable across supported chat platforms and DOM variance.
- Verify failure paths are explicit (no silent catch-and-ignore unless justified).

### React + TypeScript Quality
- Prefer explicit typing and safe narrowing; flag leaky `any` usage.
- Validate hook usage: complete dependencies, no side-effect loops, no stale closure bugs.
- Flag derived-state duplication and unnecessary rerender pressure.
- Ensure component boundaries are focused and testable.

### Accessibility (A11y)
- Validate semantic controls, keyboard operability, visible focus states, and usable labels.
- Check icon-only buttons and custom controls for accessible naming.
- Ensure status/error states are perceivable and not color-only.

### Security + Privacy
- Flag unsafe HTML insertion or unsanitized content handling.
- Validate message/action boundaries between popup/content/background.
- Enforce least privilege for manifest permissions and host matches.
- Prevent sensitive data leakage in logs, exports, or telemetry.

### Performance
- Watch for repeated expensive DOM queries, large synchronous operations, and unnecessary observers.
- Check for debouncing/batching on high-frequency handlers.
- Flag bundle bloat and heavy dependency additions without clear need.

### Maintainability
- Ensure naming, structure, and abstractions match existing repo patterns.
- Prefer small, focused changes over sprawling refactors.
- Require docs updates when behavior/permissions/platform support changes.

## MV3 + Extension-Specific Checks
- No remote executable code patterns.
- Service worker assumptions account for suspend/resume behavior.
- `manifest` updates are mirrored in constants/content logic when required.
- Browser API calls should use `src/utils/browser.ts` wrappers where practical.

## Review Checklist
- [ ] No correctness regressions in main user flows.
- [ ] A11y baseline preserved or improved.
- [ ] Security/privacy posture unchanged or stronger.
- [ ] Performance impact acceptable and justified.
- [ ] Permission surface not expanded unnecessarily.
- [ ] Build/lint/manual smoke tests are adequate for change risk.

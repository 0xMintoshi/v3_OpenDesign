# Product

## Register

product

## Users

Dental surgeons (primary: Minzhe, practicing in Singapore). Used chairside or at a desk during treatment planning consultations. The clinician is the only user — no patients interact with this UI directly.

## Product Purpose

An interactive SVG dental chart embedded as an iframe inside a quotation/treatment planning app. The clinician maps existing dentition (Stage 1) and then assigns treatments per tooth — implants, crowns, bridges, bone grafts, extractions (Stage 2). The chart's output drives the quotation summary and CHAS subsidy calculations in the parent app.

## Brand Personality

Editorial, calm, considered. The chart is a precision instrument, not a dashboard. It should feel like a well-designed medical reference — authoritative without being cold, typographically refined, unhurried. Matches the parent app's titan-editorial language: Instrument Serif headings, DM Sans body, warm-neutral tones.

## Anti-references

- Generic SaaS blue (Salesforce/Jira): cold blue accent, flat white cards, navy-on-white — the current chart aesthetic
- Overdesigned dashboards: metric cards, data-heavy widgets, chart-per-section layouts
- Dental stock-photo aesthetic: teal-and-white palettes, tooth-icon branding, health-app gradients

## Design Principles

1. **Precision without coldness** — UI chrome should feel as refined as surgical instruments: purposeful geometry, no decorative noise, but warm enough that a patient glancing over isn't intimidated.
2. **Typography carries hierarchy** — Instrument Serif for display/titles (patient names, tooth IDs, procedure headings), DM Sans for labels and body copy. Type does the work that color and decoration usually overbear.
3. **Chrome serves the chart** — floating UI elements (treatment cards, procedure menu) must be secondary to the dental arch SVG, not compete with it. Minimal footprint, maximum clarity.
4. **Consistent with the parent** — the chart is embedded; its floating UI (cards, popovers) should feel like they belong to the same app, not like a different product dropped in.

## Accessibility & Inclusion

WCAG AA minimum. Keyboard navigable (Enter to open treatment menu, Escape to clear). Functional in both light (default) and dark themes already supported by the chart's token system.

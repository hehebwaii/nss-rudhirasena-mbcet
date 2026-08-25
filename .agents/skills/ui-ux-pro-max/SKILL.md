---
name: ui-ux-pro-max
description: "UI/UX design intelligence for web, mobile, and desktop. Use when designing, building, reviewing, or fixing interfaces, including pages, components, design systems, accessibility, interaction, responsive layout, typography, color, charts, and stack-specific UI implementation. Provides rules for 79 styles, 192 product palettes, 74 font pairings, 119 UX guidelines, and WCAG compliance."
version: 2.0.0
user-invocable: true
license: MIT
---

# UI/UX Pro Max - Design Intelligence

Comprehensive UI/UX design intelligence system for modern web, mobile, and desktop applications.

## When to Apply

Use this skill whenever working on:
- Frontend layout, components, views, and landing pages
- Color palettes, typography systems, and design tokens
- UX workflows, accessibility audits, and micro-interactions
- Responsive adaptations across mobile, tablet, and desktop

## Priority Rule Categories (1 -> 10)

| Priority | Category | Impact | Key Checks (Must Have) | Anti-Patterns (Avoid) |
|---|---|---|---|---|
| 1 | **Accessibility** | CRITICAL | WCAG AA 4.5:1 contrast, visible focus rings, aria-labels, semantic HTML | Removing focus outlines, low-contrast text, icon-only buttons with no aria-label |
| 2 | **Touch & Interaction** | CRITICAL | Minimum 44×44px touch targets, 8px+ touch spacing, instant visual feedback | Hover-only interactions on mobile, unresponsive buttons |
| 3 | **Performance & Layout Shift** | HIGH | Explicit image dimensions, CSS containment, lazy loading, CLS < 0.1 | Layout jumping during asset loading, unoptimized heavy assets |
| 4 | **Style Consistency** | HIGH | Cohesive visual language (e.g. Modern Minimalist, Glassmorphism, Brutalism) | Inconsistent border radii, clashing shadows, mixed aesthetics |
| 5 | **Responsive Layout** | HIGH | Mobile-first flex/grid, fluid typography, no horizontal scrollbars | Fixed-pixel widths (`width: 1200px`), disabling pinch-to-zoom |
| 6 | **Typography & Color** | MEDIUM | 16px base body font, 1.5–1.6 line height, curated 60-30-10 color balance | Pure black `#000` text on pure white `#fff`, text < 12px, font salad |
| 7 | **Animation & Motion** | MEDIUM | Snappy durations (150–300ms), ease-out curves, respect `prefers-reduced-motion` | Heavy sluggish transitions (>600ms), animating layout triggers (width/height) |
| 8 | **Forms & Inputs** | MEDIUM | Floating or persistent labels, inline error messages, autofill attributes | Placeholders as labels, generic top-only error banners |
| 9 | **Navigation & Hierarchy** | HIGH | Clear active states, breadcrumbs/back navigation, sticky headers when needed | Hidden navigation, ambiguous iconography, deep dead-ends |
| 10 | **Data Visualization** | LOW | Distinct color scales, legends, interactive tooltips, fallback data tables | Relying solely on color to differentiate chart slices |

## Curated Color & Typography Systems

- **Health / Blood Donation / NGO Palette**:
  - Primary: Deep Crimson / Ruby (`#DC2626` / `#B91C1C`)
  - Secondary: Rose / Slate (`#F43F5E` / `#0F172A`)
  - Background: Clean Porcelain / Dark Slate (`#F8FAFC` / `#090D16`)
  - Accent / Success: Emerald (`#10B981`)
- **Typography Pairings**:
  - Headings: `Outfit`, `Plus Jakarta Sans`, or `Inter` (Font weight 600–800)
  - Body: `Inter`, `Roboto`, or `system-ui` (Font weight 400–500, line-height 1.6)

## Pre-Delivery Quality Checklist

- [ ] Responsive at 375px (Mobile), 768px (Tablet), and 1280px+ (Desktop)
- [ ] Contrast ratio >= 4.5:1 for standard text, 3:1 for large headings
- [ ] Interactive states defined (hover, active, focus, disabled)
- [ ] No layout shift (CLS < 0.1) or horizontal overflowing containers
- [ ] Smooth transitions and clear visual hierarchy

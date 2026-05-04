---
name: Idea Radar
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#181919'
  on-primary: '#ffffff'
  primary-container: '#2d2d2d'
  on-primary-container: '#959494'
  inverse-primary: '#c8c6c6'
  secondary: '#5e5e5d'
  on-secondary: '#ffffff'
  secondary-container: '#e0dfde'
  on-secondary-container: '#626361'
  tertiary: '#191914'
  on-tertiary: '#ffffff'
  tertiary-container: '#2e2d29'
  on-tertiary-container: '#97948e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4e2e1'
  primary-fixed-dim: '#c8c6c6'
  on-primary-fixed: '#1b1c1c'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e3e2e0'
  secondary-fixed-dim: '#c7c6c5'
  on-secondary-fixed: '#1a1c1b'
  on-secondary-fixed-variant: '#464746'
  tertiary-fixed: '#e6e2db'
  tertiary-fixed-dim: '#cac6bf'
  on-tertiary-fixed: '#1c1c17'
  on-tertiary-fixed-variant: '#484742'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e3e2e2'
typography:
  h1:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1280px
---

## Brand & Style

This design system is built for the "Idea Radar," a personal intelligence dashboard for AI builders. The brand personality is **Intelligent, Focused, Premium, and Personal**. It prioritizes clarity over decoration, providing a serene environment for high-level synthesis and deep work.

The design style is **Warm Minimalism**. It rejects the coldness of standard tech interfaces by using a palette rooted in natural paper tones and stone grays. By replacing heavy shadows with tonal layers and hairline borders, the UI feels physical and grounded, akin to a high-end stationery set or a gallery catalog. The emotional response should be one of "quiet confidence"—a tool that fades into the background to let the user's ideas take center stage.

## Colors

The palette is anchored in **warm whites and soft stone grays**. The primary background uses a "Paper" white, while subtle depth is created through "Stone" shifts rather than shadows.

- **Primary Canvas:** `#F9F8F6` (Warm White) provides a soft, low-strain background.
- **Secondary Surfaces:** `#F1EFEA` (Cream) for sidebars or secondary containers.
- **Borders & Dividers:** `#E5E1DA` (Soft Stone) for 1px hairline separators.
- **Typography:** `#2D2D2D` for high-contrast headings; `#555555` for body text.
- **Semantic Accents:** Used sparingly to categorize ideas:
    - **High Novelty (Green):** A desaturated, sophisticated olive (`#4B6344`).
    - **Mid Novelty (Amber):** A muted, sun-baked ochre (`#D9A05B`).
    - **Low Novelty (Gray):** A cool, neutral slate (`#929292`).

## Typography

This design system uses a distinctive pairing of **Newsreader** (Serif) and **Plus Jakarta Sans** (Sans-Serif) to balance intellectual authority with modern utility.

- **Headings:** Newsreader is used for all major titles. Its literary, classic feel evokes a sense of "intelligence" and "curation." Use it for dashboard headers and idea titles.
- **UI & Body:** Plus Jakarta Sans provides a clean, approachable, and highly legible experience for information-dense areas. Its slightly wider character set aids readability in complex dashboards.
- **Labels:** Small labels and tags should use Plus Jakarta Sans with increased letter spacing and uppercase styling to provide clear hierarchy without adding visual weight.

## Layout & Spacing

The layout philosophy follows a **fixed grid** approach for dashboards to maintain a structured, organized feel, while switching to a centered "focus mode" for individual idea analysis.

- **Grid:** A 12-column grid with 24px gutters.
- **Margins:** Generous outer margins (minimum 40px) ensure the interface feels airy and premium.
- **Rhythm:** All spacing units are multiples of 4px. Use larger gaps (`40px+`) between distinct sections to reinforce the minimal aesthetic.
- **Density:** Maintain a "Comfortable" density. AI builders process a lot of data; the extra whitespace helps prevent cognitive overload.

## Elevation & Depth

This design system deliberately **eschews shadows** in favor of **Tonal Layers and Low-Contrast Outlines**.

- **Level 0 (Canvas):** The base background in `#F9F8F6`.
- **Level 1 (Cards/Containers):** Raised surfaces use a slightly lighter background (White) or a slightly darker one (`#F1EFEA`) depending on importance.
- **Borders:** Every container is defined by a crisp 1px border in `#E5E1DA`.
- **Interactions:** Hover states should not use shadows. Instead, use a subtle background color shift (e.g., from a cream to a slightly warmer tint) or a slightly darker border.
- **Focus:** Active states are indicated by a 1px border shift to the primary color (`#2D2D2D`) or a subtle status color accent.

## Shapes

The shape language is **Soft**. It avoids both the harshness of sharp corners and the playfulness of overly rounded pills.

- **Standard UI:** 4px (0.25rem) corner radius for buttons, inputs, and small chips.
- **Cards/Modules:** 8px (0.5rem) corner radius for main dashboard cards.
- **Selection/Indicators:** Use vertical bars (2px width) on the left side of active list items or menu links to reinforce a "radar" or "ledger" aesthetic.

## Components

- **Buttons:** Use a solid fill for primary actions (Dark Gray with White text) and a 1px border-only style for secondary actions. No shadows.
- **Idea Chips:** Small tags that indicate novelty status. They should have a very subtle background tint of the status color with text in a darker shade of that same color.
- **Cards:** Cards should be transparent with a 1px border, or filled with a level-1 tonal shift. Titles within cards always use the Newsreader serif.
- **Inputs:** Clean 1px borders. On focus, the border darkens to the primary text color. Labels are always small-cap Sans-Serif.
- **Radar Feed:** A specialized list component using high-novelty green markers to highlight new intelligence. 
- **The "Intel" Toggle:** A custom radio-switch that feels like a physical toggle, using the cream and stone palette to indicate state.
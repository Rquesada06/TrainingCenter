---
name: Elite Bio-Performance
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c1c6d7'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e909a'
  outline-variant: '#414755'
  surface-tint: '#adc6ff'
  primary: '#d8e2ff'
  on-primary: '#122f5f'
  primary-container: '#adc6ff'
  on-primary-container: '#00285c'
  inverse-primary: '#455e90'
  secondary: '#d7ffc5'
  on-secondary: '#053900'
  secondary-container: '#30f802'
  on-secondary-container: '#106d00'
  tertiary: '#e2e2e3'
  on-tertiary: '#2f3132'
  tertiary-container: '#c6c6c7'
  on-tertiary-container: '#515253'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#2c4677'
  secondary-fixed: '#79ff5b'
  secondary-fixed-dim: '#2be500'
  on-secondary-fixed: '#022100'
  on-secondary-fixed-variant: '#0a5300'
  tertiary-fixed: '#e3e2e3'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1d'
  on-tertiary-fixed-variant: '#454748'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
  glow-primary: rgba(173, 198, 255, 0.3)
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  gutter: 16px
  container-padding-mobile: 24px
  container-padding-desktop: 64px
  section-gap: 40px
---

## Brand & Style
The visual identity is rooted in **Scientific Elite Athleticism**. It targets high-performance athletes and data-driven fitness enthusiasts who value precision over trendiness. 

The design style is a sophisticated blend of **Glassmorphism** and **Atmospheric Dark Mode**. It uses deep, monochromatic foundations layered with translucent "Bento-style" containers and vibrant, high-energy accents. The interface should feel like a premium laboratory instrument: technical, precise, and authoritative, yet emotionally charged through the use of ethereal glows and high-contrast focal points.

## Colors
The palette is dominated by a deep "Midnight Obsidian" (`#0e0e0e`), providing a void-like canvas for technical information. 

- **Primary (Electric Blue):** Used for main CTAs and branding. It represents the "Science" and "Tech" aspect.
- **Secondary (Bio-Neon Green):** Reserved for metrics, progress, and biological data visualization. It represents vitality and growth.
- **Surface Strategy:** Instead of flat grays, surfaces use a 40% opaque container with a heavy backdrop blur (12px+) to create a sense of deep, layered glass.
- **Atmospheric Accents:** Use radial gradients and vignette overlays to pull focus toward the center of the screen, ensuring the UI feels immersive rather than flat.

## Typography
We utilize **Inter** across all roles to maintain a clean, utilitarian aesthetic that emphasizes legibility.

- **Scale:** The system uses a dramatic scale contrast. Display sizes are heavy (`800` weight) with negative letter spacing to feel impactful and tight.
- **Labels:** Use `uppercase` and increased letter spacing for tertiary information (like footers or system tags) to evoke a "classified" or "technical" feel.
- **Hierarchy:** High-priority headlines should utilize the primary color or high-contrast white, while secondary body text drops to `on-surface-variant` (`#c1c6d7`) to reduce visual noise.

## Layout & Spacing
The system follows a **Fixed-Grid hybrid** model. While the outer containers respond to the viewport, content is often grouped into maximum-width "Bento boxes" to maintain information density.

- **Grid:** Use a 12-column grid for desktop with 16px gutters.
- **Bento Logic:** Secondary information is organized into cards with a standard `section-gap` between logical groups.
- **Padding:** Generous horizontal padding (`64px` on desktop) ensures content feels premium and not "cramped" against the edges of the screen.

## Elevation & Depth
Depth is achieved through **optical translucency** rather than traditional shadows.

1.  **Background:** Pure black or extremely dark containers (`#0e0e0e`).
2.  **Mid-ground:** Translucent containers (`surface-container/40`) with `backdrop-blur` (20px) and a subtle 1px border (`outline-variant/30`).
3.  **Interactive Layer:** High-glow elements. Buttons use a diffused `box-shadow` that matches their background color (e.g., a blue glow for a blue button) to simulate a light-emitting source.
4.  **Atmosphere:** A subtle pulse animation on background elements creates a "living" UI.

## Shapes
The shape language is **hybrid-geometric**. 

- **Cards/Modules:** Use `rounded-xl` (1.5rem) to soften the technical data and make the interface feel modern.
- **Action Elements:** Primary buttons are **Pill-shaped** (`9999px`) to distinguish them from informational containers and suggest a "start" or "go" action.
- **Icons:** Use Material Symbols with a standard weight of 400, ensuring they are sized consistently within their parent containers.

## Components

### Buttons
- **Primary:** Pill-shaped, Primary color background, with a matching color shadow (30% opacity, 40px blur). On hover, scale 105%.
- **Ghost/Text:** `label-md` weight, with a subtle underline appearing only on hover or active states.

### Data Cards (Bento)
- Background: `surface-container` at 40% opacity.
- Border: 1px solid `outline-variant` at 30% opacity.
- Feature: Must have `backdrop-filter: blur(12px)`.

### Icons
- Icons used within cards should use the color that corresponds to the data type (e.g., Primary blue for tech/AI, Secondary green for health/metrics).

### Inputs
- Should follow the card style: dark, semi-transparent background with a clear focus ring in the primary color.
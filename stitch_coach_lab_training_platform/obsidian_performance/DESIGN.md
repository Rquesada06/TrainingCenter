---
name: Obsidian Performance
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#b9ccb5'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#849581'
  outline-variant: '#3b4b3a'
  surface-tint: '#00e55b'
  primary: '#edffe8'
  on-primary: '#003911'
  primary-container: '#00ff66'
  on-primary-container: '#007128'
  inverse-primary: '#006e27'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#4a4949'
  on-secondary-container: '#bab8b7'
  tertiary: '#fdf9f9'
  on-tertiary: '#313030'
  tertiary-container: '#e0dddc'
  on-tertiary-container: '#626161'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6bff83'
  primary-fixed-dim: '#00e55b'
  on-primary-fixed: '#002107'
  on-primary-fixed-variant: '#00531b'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.1em
  metric-xl:
    fontFamily: Hanken Grotesk
    fontSize: 64px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
  container-max: 1200px
---

## Brand & Style
The design system embodies "Tech-Noir Minimalism"—a high-fidelity aesthetic that blends the discipline of elite athletic performance with the precision of modern engineering. It is designed for high-end fitness coaching where data accuracy and aesthetic focus are paramount.

The visual language draws inspiration from the utility of developer tools and the luxury of high-performance automotive interfaces. It utilizes a deep, monochromatic foundation punctuated by high-frequency accents to direct user attention toward progress and action. The emotional response should be one of "controlled power": focused, elite, and technologically superior.

## Colors
This design system operates exclusively in a dark-mode-first environment to reduce visual fatigue and emphasize the vibrant accent color.

- **Backgrounds:** The foundation is `#0E0E0E` (Obsidian), providing a pure, deep canvas.
- **Surface Tiers:** Use `#121212` for primary surfaces and `#1A1A1A` for elevated cards or strokes.
- **Electric Green:** `#00FF66` is used sparingly but impactfully for primary actions, success states, and performance metrics.
- **Grays:** A scale of sophisticated grays (Zinc-based) handles text hierarchy, with high-contrast white reserved only for headings.

## Typography
The typography system uses **Hanken Grotesk** for its razor-sharp precision and modern humanist characteristics. It provides the "high-precision" feel required for a tech-heavy coaching app.

- **Display & Headlines:** Use tight letter-spacing and heavy weights to create a sense of authority.
- **Metrics:** For workout stats (reps, weight, time), use the `metric-xl` style to create a focal point.
- **Labels:** **JetBrains Mono** is introduced for secondary metadata and technical labels to reinforce the "engineered" aesthetic.
- **Hierarchy:** Maintain clear contrast between primary white text and secondary gray text to guide the eye through dense data.

## Layout & Spacing
The layout follows a rigorous 8px grid system. 

- **Grid:** Use a 12-column fluid grid for desktop and a 4-column grid for mobile.
- **Margins:** Generous outer margins (40px on desktop) preserve the minimalist feel and prevent the UI from feeling cluttered.
- **Rhythm:** Use multiples of 8px for vertical spacing. Elements should be grouped logically: 8px for related items (labels/inputs), 24px for component groups, and 48px+ for sectional breaks.

## Elevation & Depth
Depth in this design system is achieved through "Tonal Stacking" and "Subtle Glassmorphism" rather than traditional heavy shadows.

- **Glassmorphism:** Headers, bottom navigation bars, and floating action panels use a backdrop-blur (20px) with a semi-transparent surface (`rgba(18, 18, 18, 0.7)`).
- **Borders:** Surfaces are defined by 1px solid borders in a slightly lighter gray (`#262626`). These "fine lines" replace shadows for a cleaner, more technical look.
- **Ambient Glow:** Only the primary "Electric Green" elements may utilize a soft, diffused shadow (15% opacity green) to simulate a subtle neon glow against the dark background.

## Shapes
The shape language balances modern approachability with structured precision. 

- **Components:** Standard buttons and cards use a 12px radius (derived from `rounded-lg`).
- **Containers:** Larger dashboard sections or modal overlays use a 16px radius (`rounded-xl`).
- **Interactive States:** Inputs maintain a consistent 8px radius to feel slightly sharper and more functional.

## Components

### Buttons
- **Primary:** Background `#00FF66`, text `#0E0E0E`, 12px radius. Bold weight.
- **Secondary:** Transparent background, 1px border `#262626`, text `#FFFFFF`.
- **Ghost:** No background or border, Electric Green text for low-priority actions.

### Cards & Containers
Cards should use the `#121212` surface color with a 1px border of `#262626`. For "Performance Cards," incorporate a subtle vertical gradient (top-to-bottom: `#1A1A1A` to `#121212`) to draw the eye.

### Inputs
Fields should have a dark background (`#0E0E0E`) with a 1px border that shifts to Electric Green on focus. Use JetBrains Mono for placeholder text to maintain the technical vibe.

### Performance Chips
Small, 8px rounded capsules with a `#1A1A1A` background. Used for tagging workout types (e.g., "Hypertrophy", "Recovery").

### Lists & Charts
Lists should be borderless, separated by subtle 1px horizontal dividers (`#1A1A1A`). Performance charts should utilize Electric Green for the primary data line, with a soft green gradient fill (10% opacity) underneath the curve.
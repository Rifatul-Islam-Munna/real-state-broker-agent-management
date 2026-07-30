---
name: Ether Dashboard System
colors:
  surface: "#f8f9ff"
  surface-dim: "#cbdbf5"
  surface-bright: "#f8f9ff"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#eff4ff"
  surface-container: "#e5eeff"
  surface-container-high: "#dce9ff"
  surface-container-highest: "#d3e4fe"
  on-surface: "#0b1c30"
  on-surface-variant: "#464555"
  inverse-surface: "#213145"
  inverse-on-surface: "#eaf1ff"
  outline: "#767586"
  outline-variant: "#c7c4d7"
  surface-tint: "#4849da"
  primary: "#4343d5"
  on-primary: "#ffffff"
  primary-container: "#5d5fef"
  on-primary-container: "#faf7ff"
  inverse-primary: "#c1c1ff"
  secondary: "#006b5f"
  on-secondary: "#ffffff"
  secondary-container: "#6df5e1"
  on-secondary-container: "#006f64"
  tertiary: "#b40036"
  on-tertiary: "#ffffff"
  tertiary-container: "#d8294c"
  on-tertiary-container: "#fff6f5"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#e1e0ff"
  primary-fixed-dim: "#c1c1ff"
  on-primary-fixed: "#07006c"
  on-primary-fixed-variant: "#2e2bc2"
  secondary-fixed: "#71f8e4"
  secondary-fixed-dim: "#4fdbc8"
  on-secondary-fixed: "#00201c"
  on-secondary-fixed-variant: "#005048"
  tertiary-fixed: "#ffdadb"
  tertiary-fixed-dim: "#ffb2b7"
  on-tertiary-fixed: "#40000d"
  on-tertiary-fixed-variant: "#92002a"
  background: "#f8f9ff"
  on-background: "#0b1c30"
  surface-variant: "#d3e4fe"
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: "600"
    lineHeight: "1.3"
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: "600"
    lineHeight: "1.4"
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.6"
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: "400"
    lineHeight: "1.5"
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: "600"
    lineHeight: "1"
    letterSpacing: 0.05em
  numeric-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: "700"
    lineHeight: "1"
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 32px
  gutter: 24px
  margin-sm: 16px
  margin-md: 24px
  margin-lg: 48px
---

## Brand & Style

The design system is engineered for high-performance SaaS and financial platforms. It evokes a sense of **quiet authority** and **intellectual clarity** through a Modern Corporate aesthetic. The primary objective is to transform complex data into an effortless visual narrative.

The personality is professional yet progressive, utilizing generous whitespace to reduce cognitive load. It avoids the generic "utility blue" in favor of a sophisticated palette of deep purples and vibrant teals, signaling a premium, design-forward product. The emotional response is one of confidence, precision, and calm.

## Colors

The palette is built on a foundation of "Ether Greys" with surgical applications of saturated accents.

- **Primary (Deep Purple):** Used for core branding, active states, and primary actions. It provides a more editorial feel than standard blue.
- **Secondary (Teal):** Used for success states, growth indicators, and data visualization highlights.
- **Tertiary (Rose):** Reserved for negative trends, alerts, and critical errors.
- **Neutral (Slate):** A range of cool-toned greys used for text hierarchy, borders, and subtle background layering.
- **Background:** A very light off-white (#F8FAFC) is used for the page body to ensure the white cards pop with clarity.

## Typography

This design system utilizes **Manrope** as the primary typeface for its modern, geometric construction that retains high legibility in data-heavy environments. **Hanken Grotesk** is used for labels and utility text to provide a technical, sharp contrast.

- **Data Presentation:** Large numeric values use `numeric-lg` with tightened letter spacing to emphasize impact.
- **Hierarchy:** Use `label-caps` for sidebar category headers and table headers to create clear structural separation.
- **Mobile Scaling:** For mobile screens, `display-lg` scales down to 28px, and `numeric-lg` scales to 24px.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a fixed vertical sidebar (280px) and a flexible content area.

- **Grid:** A 12-column grid is used for the main dashboard area.
- **Gutter:** A consistent 24px gutter ensures data visualizations do not feel cramped.
- **Rhythm:** All margins and paddings are multiples of 8px. Use 32px padding for the main page containers to maintain an "airy" feel.
- **Responsiveness:**
  - **Desktop (1280px+):** 12 columns, 32px margins.
  - **Tablet (768px - 1279px):** 6 columns, 24px margins, sidebar collapses to icons.
  - **Mobile (<768px):** 1 column, 16px margins, sidebar becomes a bottom navigation or hamburger menu.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows** rather than heavy borders.

- **Surface 0 (Background):** #F8FAFC. The lowest level.
- **Surface 1 (Cards):** Pure White (#FFFFFF). Uses a very soft, diffused shadow: `0 4px 20px rgba(0, 0, 0, 0.03)`.
- **Surface 2 (Interactive/Hover):** Pure White. Uses a more pronounced shadow to indicate lift: `0 10px 30px rgba(93, 95, 239, 0.08)`.
- **Navigation:** The sidebar uses a subtle right-border (1px, #EDF2F7) instead of a shadow to maintain a clean vertical axis.

## Shapes

The shape language is consistently **Rounded**, striking a balance between approachable and professional.

- **Cards & Large Containers:** Use `rounded-xl` (24px) to soften the layout and create a modern, app-like feel.
- **Buttons & Inputs:** Use `rounded-md` (8px) for a more precise, functional appearance.
- **Status Chips:** Use a full "Pill" radius for maximum distinction from other UI elements.

## Components

### Buttons

- **Primary:** Solid Deep Purple background with White text. Subtle 8px corner radius.
- **Secondary:** Ghost style with Teal border and Teal text for growth-related actions.
- **Icon Buttons:** Transparent background with Slate icons, transitioning to a light grey circle on hover.

### Cards

- White background, 24px corner radius.
- Padding should be a minimum of 24px.
- Internal headers should use `headline-sm` with a bottom border or generous margin.

### Input Fields

- Background-colored (#F1F5F9) or white with a 1px Slate-200 border.
- Focus state: 2px Deep Purple border with a soft glow.

### Chips & Badges

- Used for status (e.g., "Active", "Pending").
- Use low-opacity background of the status color (e.g., Teal at 10% opacity) with high-saturation text for readability.

### Data Visualization

- Bar charts and line graphs should prioritize the Primary (Purple) and Secondary (Teal) colors.
- Use rounded caps on bar charts to match the overall shape language.

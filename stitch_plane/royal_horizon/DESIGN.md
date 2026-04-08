# Design System Document: The Sovereign Experience

## 1. Overview & Creative North Star

**Creative North Star: "The Digital Concierge"**

This design system rejects the "utilitarian grid" common in budget travel sites in favor of a high-end editorial aesthetic. Our goal is to simulate the transition from a bustling terminal to the hushed, pressurized luxury of a First Class cabin.

We move beyond standard UI by utilizing **Intentional Asymmetry** and **Tonal Depth**. Instead of a centered, rigid layout, we use wide-measure typography paired with high-quality, full-bleed imagery that "breaks" the container. Elements should feel like they are floating on layers of fine parchment and silk, utilizing overlapping components to create a sense of bespoke craftsmanship rather than templated assembly.

---

## 2. Colors & Surface Philosophy

The palette is rooted in a heritage of prestige: Deep Burgundy (`primary`), Gold/Bronze (`secondary`), and a sophisticated spectrum of Warm Greys (`surface`).

### The "No-Line" Rule

To maintain a premium, seamless feel, **1px solid borders are prohibited for sectioning.** Structural boundaries must be defined solely through:

1.  **Background Color Shifts:** Placing a `surface-container-low` section against a `surface` background.
2.  **Tonal Transitions:** Using subtle shifts between `surface-bright` and `surface-container`.

### Surface Hierarchy & Nesting

Treat the UI as a physical stack of luxury materials.

- **Base:** `surface` (#f9f9f9) for the primary canvas.
- **Layer 1:** `surface-container-low` (#f3f3f3) for large content areas (e.g., flight search results).
- **Layer 2:** `surface-container-lowest` (#ffffff) for high-priority interactive cards, creating a "lifted" effect against the grey base.

### The "Glass & Gradient" Rule

Standard flat buttons are insufficient for this identity.

- **Signature Textures:** Use a subtle linear gradient for Hero backgrounds and Primary CTAs, transitioning from `primary` (#a12428) to `primary_container` (#c33d3d) at a 135-degree angle. This adds "visual soul" and depth.
- **Glassmorphism:** For floating navigation bars or destination overlays, use `surface` at 80% opacity with a `20px` backdrop-blur.

---

## 3. Typography

We utilize a pairing of **Be Vietnam Pro** for authoritative displays and **Manrope** for high-performance functional reading.

- **Display (Be Vietnam Pro):** Used for "The Hook." Large scale (`display-lg`: 3.5rem) with tight letter-spacing to convey power and exclusivity.
- **Headlines (Be Vietnam Pro):** Used for destination names and section headers. High contrast against the body text.
- **Titles & Body (Manrope):** Chosen for its modern, clean legibility in complex booking flows. `title-md` (1.125rem) should be used for flight times and price points.
- **Labels (Manrope):** Smallest scale (`label-sm`: 0.6875rem), used exclusively in ALL CAPS with `0.05rem` letter-spacing for a "technical luxury" feel.

---

## 4. Elevation & Depth

Hierarchy is achieved through **Tonal Layering** and **Ambient Shadows**, never through heavy lines.

- **The Layering Principle:** To highlight a flight card, do not use a border. Place a `surface-container-lowest` card on a `surface-container` background. The contrast provides the "edge."
- **Ambient Shadows:** For floating elements (e.g., a "Select Seat" modal), use an extra-diffused shadow: `box-shadow: 0 12px 40px rgba(26, 28, 28, 0.06)`. Note the use of the `on-surface` color (#1a1c1c) for the shadow tint rather than pure black.
- **The "Ghost Border" Fallback:** If a divider is mandatory for accessibility, use `outline-variant` (#e6bdb8) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons

- **Primary:** Gradient of `primary` to `primary_container`. Text: `on_primary` (#ffffff). Border-radius: `md` (0.375rem).
- **Secondary:** Ghost style. Background: `transparent`. Border: "Ghost Border" (15% `outline-variant`). Text: `secondary` (#765a17).
- **Interaction:** On hover, primary buttons should shift +2px upward with an Ambient Shadow.

### Cards & Lists (Flight Search Results)

- **Layout:** Forbid divider lines. Use `spacing-6` (2rem) of vertical white space to separate flight options.
- **Visuals:** Use `surface-container-lowest` for the card body. The price point should be highlighted in `secondary` (Gold).

### Booking Inputs

- **Fields:** Use `surface-container-highest` for the input background to provide a recessed, "etched" look. No border. Label should be `label-md` floating above the field.
- **Focus State:** A soft 2px glow using `secondary_fixed` (#ffdf9e) at 50% opacity.

### Signature Component: The "Destination Veil"

A bespoke component for destination highlights. A full-bleed image with a `surface` gradient overlaying the bottom 30%, where typography is set in `display-sm` (Be Vietnam Pro) using `on-surface` color.

---

## 6. Do's and Don'ts

### Do

- **Do** use asymmetrical imagery placement (e.g., an aircraft tail bleeding off the right edge of a container).
- **Do** prioritize whitespace. If a layout feels "full," increase the spacing scale by one increment (e.g., move from `8` to `10`).
- **Do** use `secondary` (Gold/Bronze) sparingly—only for accents, prices, and high-level confirmation states.

### Don't

- **Don't** use 100% opaque black or grey for shadows or borders.
- **Don't** use standard "system" fonts. Always stick to the Be Vietnam Pro/Manrope pairing.
- **Don't** use high-saturation "Error Reds." Use the provided `error` (#ba1a1a) which is balanced to work with the Burgundy palette.
- **Don't** crowd the "Booking Engine" (Search bar). It should have a minimum of `spacing-12` (4rem) padding from surrounding content to maintain an "unhurried" feel.

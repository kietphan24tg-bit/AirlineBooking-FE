# Manage Booking UI Unification

## Visual Thesis
Premium airline operations UI: calm ivory surfaces, midnight burgundy anchors, restrained luxury-gold accents, and clearer hierarchy with less generic white-card/red-button styling.

## Shared Design System

- Background: `#f9f6f1`
- Primary brand: `#7d0633`
- Accent gold: `#d4af37`
- Text: `#1a1a1a`
- Surface cards: white with subtle glass effect and light gold border
- Headline font: `Be Vietnam Pro`
- Body font: `Manrope`
- Radius scale: `24px`, `28px`
- Primary CTA: burgundy pill, white text
- Secondary CTA: white surface, burgundy border/text
- Progress connector: thin gold line
- Active step: burgundy fill
- Completed step: muted gold or emerald only when status semantics require success

## Why Current Pages Feel Off

### `ChangeFlight`

- Uses hardcoded `red-*` and `stone-*` colors instead of project tokens.
- Reads like a generic admin wizard, not part of the same premium airline brand.
- Main content is too flat: header, stepper, cards, notice, and actions all have nearly the same visual weight.

### `Checkin`

- Same hardcoded `red-*`, `stone-*`, `bg-[#faf8f4]` palette issue.
- Dense information is presented with many similar cards, so scanning is harder than necessary.
- The flow is visually separate from `ManageBooking`, `Landing`, `SeatSelection`, and the newer token-based pages.

### `CancelFlight`

- Closest to the intended system because it already uses `bg-surface`, `text-on-surface`, `bg-primary`.
- Still benefits from aligning more strongly with the midnight-burgundy + luxury-gold brand treatment used by `ManageBooking`, `Landing`, and `CheckoutResult`.

## Proposed Direction

## 1. Change Flight

- Add a small gold eyebrow: `BOOKING CHANGE`
- Title: `Change your flight`
- Keep booking reference and status chip directly below title.
- Replace the current red/gray stepper with:
  - burgundy active step
  - pale ivory inactive nodes
  - gold connectors
- Convert the chosen-flight list into grouped itinerary rows:
  - selected row gets a 4px burgundy edge accent
  - small gold fare tag
  - softer ivory selected background instead of red outline
- Add a right summary rail:
  - current fare
  - change fee note
  - passenger count
  - support contact block

## 2. Check-in

- Add eyebrow: `ONLINE CHECK-IN`
- Title: `Check in online`
- Introduce a two-column workspace:
  - left: flight selection, passenger selection, seat-required notice
  - right: booking info, trip summary, selected-flight status
- Use one structured notice card for seat-selection-required state with gold accent, not red warning styling.
- Reduce repeated card treatment by using section dividers and grouped rows inside one main panel.
- Reserve stronger color only for CTA and true status states.

## 3. Cancel Booking

- Add eyebrow: `BOOKING CANCELLATION`
- Title: `Cancel booking`
- Keep the calmer token-driven approach already present.
- Tighten layout into:
  - left: passenger + flight selection matrix
  - right: refund estimate and cancellation summary
- Use burgundy/gold for normal interface states.
- Use error red only for:
  - irreversible confirmation notice
  - failed cancellation state

## Wireframe Structure

### Shared Top Section

1. Fixed burgundy site header
2. Page container with generous top spacing
3. Gold eyebrow label
4. Large page title
5. Booking reference/status chips
6. Branded progress stepper

### Main Workspace

- Desktop: `minmax(0, 1fr) + 320px` split
- Mobile: stacked layout
- Content panel:
  - white/glass surface
  - gold-tinted border
  - large radius
  - subdued shadow

## Implementation Priorities

1. Replace hardcoded `red-*`, `stone-*`, `bg-[#faf8f4]` with existing theme tokens.
2. Standardize page shell to match `ManageBooking` and newer premium pages.
3. Rebuild steppers into one reusable branded stepper.
4. Normalize card radius, border, spacing, and button styling.
5. Add summary rail pattern for multi-step management flows.

## Suggested Reusable Components

- `ManageFlowPageShell`
- `ManageFlowStepper`
- `ManageInfoRail`
- `ManageSectionCard`
- `StatusChip`
- `SelectionRow`

## Page-Specific Notes

- Do not change business content or step logic.
- Only change visual hierarchy, tokens, spacing, and interaction styling.
- Keep copy mostly utility-focused.

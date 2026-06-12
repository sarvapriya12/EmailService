# Ezen Design Excellence: Sharpness, Cleanliness, & Beauty Checklist

This document serves as the definitive quality standard for the Ezen interface. Use this checklist to ensure every screen meets our "Vibrant Humanist" aesthetic—balancing AI precision with human warmth.

---

## 1. Layout & Structural Integrity
- [ ] **Edge-to-Edge Continuity:** Headers (`TopNavBar`) and Footers must span the full viewport width or adhere strictly to the max-container width (1200px/1400px) with centered alignment.
- [ ] **Sticky Positioning:** Headers should use `sticky top-0` with a `backdrop-blur-md` and 80-90% opacity surface background to maintain context without obscuring content.
- [ ] **Overflow Mastery:** 
    - No horizontal scrollbars on the body. 
    - Use `overflow-y-auto` for long lists (e.g., Ticket Inbox, Mails Queue) while keeping the sidebar and header fixed.
    - Implement custom thin-scrollbar styling to match the plum palette.
- [ ] **The 4px/8px Grid:** All spacing (padding, margin, gaps) must be multiples of 4 or 8. Consistent whitespace is the secret to a "clean" look.

## 2. The "Squishy" Humanist Aesthetic
- [ ] **Interactive States:** Buttons and interactive cards must use `active:scale-95` transitions. This "squishy" feedback makes digital elements feel physically responsive.
- [ ] **Shadow Philosophy:** Never use pure black (#000) for shadows. Use 4-8% opacity of the `Primary` Plum or `Secondary` Teal to create depth that feels "airy" and integrated.
- [ ] **Rounded Everything:** Follow the `ROUND_EIGHT` or `ROUND_TWELVE` standard. Sharp 90-degree corners are forbidden unless used for specific "Stone & Steel" architectural accents.
- [ ] **Scribble Accents:** Use hand-drawn SVG highlights (amber/teal) for emphasis on key headings or "Human-in-the-loop" indicators.

## 3. Typography & Hierarchy
- [ ] **Font Pairing:** `Bricolage Grotesque` for personality-driven headlines; `Inter` for data-heavy body text.
- [ ] **Line Height & Letter Spacing:** Headlines should have tighter leading (1.1-1.2) for a punchy look; body text needs generous leading (1.5-1.6) for readability.
- [ ] **Contrast Ratios:** Maintain a minimum of 4.5:1 for functional text. Use `on-surface-variant` (grey) only for secondary labels, never for primary content.

## 4. Component Refinement
- [ ] **Glassmorphism:** Apply subtle glass effects (`bg-white/40 backdrop-blur-xl`) for floating modals or status cards to maintain a sense of layered "Zen" depth.
- [ ] **Icon Consistency:** Use a single weight (e.g., Material Symbols Outlined) across the entire app. Never mix filled and outlined icons in the same row.
- [ ] **State Awareness:** 
    - "Edited" messages must have the subtle yellow background highlight.
    - "Rejected" or "Unreplied" tickets need clear, color-coded status pills.

## 5. Visual "Polish" Checks
- [ ] **Empty States:** Every screen must have a beautiful "empty state" illustration or icon when no data is present.
- [ ] **Skeleton Loaders:** Match the exact dimensions of the content they replace to prevent "layout shift" (CLS) during data fetching.
- [ ] **Consistency Check:** Does this screen feel like it belongs to the same family as the *Vibrant Humanist* Palette? (Plum primary, Teal success, Amber intervention).

---
*“Design is not just what it looks like and feels like. Design is how it works.” — Ezen Humanist AI*
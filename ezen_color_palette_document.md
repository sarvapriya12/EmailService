# Ezen Color Palette Specification

This document defines the official color systems for Ezen, ranging from the signature humanist brand identity to specialized "funky" and "pro" themes.

---

## 1. Vibrant Humanist (Brand Default)
*The intersection of human warmth and artificial precision.*

- **Surface:** `#fff7fe` (Soft lavender-white)
- **Primary:** `#714b67` (Deep Plum) - Used for primary actions and brand presence.
- **Secondary:** `#006b5f` (Teal) - Used for success states and secondary navigation.
- **Accent:** `#faba72` (Amber) - Used for human-intervention alerts and highlights.
- **On-Surface:** `#1d1b1e` (Near-black)

**Design Rationale:** Approachable and premium. The plum provides a unique, sophisticated alternative to corporate blues, while the amber "scribble" accents bring a hand-drawn, human feel to the AI interface.

---

## 2. Zen Night (Dark Mode)
*Deep focus for high-productivity support sessions.*

- **Surface:** `#1F1A22` (Deep Charcoal with Plum undertones)
- **Primary:** `#DFB7FF` (Soft Lilac) - High-visibility primary for dark environments.
- **Secondary:** `#4FDBC8` (Bright Teal)
- **Accent:** `#6D4100` (Burned Orange)
- **On-Surface:** `#E6E1E6` (Warm Grey)

**Design Rationale:** Designed to reduce eye strain during long "inbox zero" sessions. The plum tint in the dark surface maintains brand continuity without being distracting.

---

## 3. Stone & Steel (Neutral/Grey)
*Professional, neutral, and architecturally polished.*

- **Surface:** `#f8f9fa` (Cool Grey)
- **Primary:** `#343a40` (Steel Grey)
- **Secondary:** `#6c757d` (Muted Slate)
- **Accent:** `#adb5bd` (Silver)
- **On-Surface:** `#212529` (Deep Slate)

**Design Rationale:** Best for white-label use cases or corporate environments where brand neutrality is required. Focuses entirely on hierarchy through value rather than hue.

---

## 4. Electric Gen-Z (High Contrast)
*Max energy, radical digital, and unapologetically bold.*

- **Surface:** `#000000` (Pure Black)
- **Primary:** `#CCFF00` (Electric Lime)
- **Secondary:** `#FF00FF` (Cyber Magenta)
- **Accent:** `#00FFFF` (Neon Cyan)
- **On-Surface:** `#FFFFFF` (White)

**Design Rationale:** A "Gen-Z" interpretation of the "Zen" theme. High-intensity colors that demand attention, optimized for younger founders and creator-led support teams.

---

## 5. Sunset Retro (Nostalgic)
*Warm tones, modern saturation, and organic resonance.*

- **Surface:** `#FFF5E6` (Cream/Parchment)
- **Primary:** `#FF6B35` (Cinnabar)
- **Secondary:** `#F7C59F` (Peach)
- **Accent:** `#004E64` (Deep Sea Blue)
- **On-Surface:** `#2D3047` (Dark Navy)

**Design Rationale:** Nostalgia redefined. This palette uses warm, organic tones to make the digital experience feel grounded and tactile.

---

## Global Implementation Rules
1. **Interactive States:** Use 4% opacity primary-tinted blurs for shadows (Never pure black).
2. **Text Hierarchy:** Ensure a minimum contrast ratio of 4.5:1 for all functional text.
3. **Motion:** Button interactions should follow a subtle `scale-95` on active states to reinforce the "squishy," humanist UI feel.
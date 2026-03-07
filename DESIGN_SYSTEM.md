# PawnPoint Design System v2.0

## Overview

This document outlines the professional SaaS design system for PawnPoint. The design follows modern principles used by companies like Linear, Stripe, Notion, and Vercel.

---

## Core Design Principles

### 1. **Clarity Over Decoration**
- Minimal animations and effects
- Clear visual hierarchy
- Consistent spacing and alignment
- No unnecessary glows, shadows, or effects

### 2. **Functional Beauty**
- Every design decision serves a purpose
- Subtle, professional interactions
- Consistent micro-interactions
- Readable typography and spacing

### 3. **Accessibility First**
- High contrast ratios (minimum WCAG AA)
- Clear focus states
- Keyboard navigation support
- Semantic HTML structure

### 4. **Performance Focused**
- Lightweight animations (0.2s - 0.3s)
- No particle effects or floating elements
- Optimized CSS and assets
- Fast, snappy interactions

---

## Color Palette

### Neutral Colors
The system uses a professional gray scale as the foundation:

```
Gray 50:   #f9fafb   (lightest, backgrounds)
Gray 100:  #f3f4f6   (light backgrounds)
Gray 200:  #e5e7eb   (light borders)
Gray 300:  #d1d5db   (subtle borders)
Gray 400:  #9ca3af   (secondary text)
Gray 500:  #6b7280   (disabled/tertiary)
Gray 600:  #4b5563   (secondary text)
Gray 700:  #374151   (headings)
Gray 800:  #1f2937   (dark backgrounds)
Gray 900:  #111827   (dark backgrounds)
Gray 950:  #030712   (darkest, dark mode base)
```

### Primary Brand Color
Indigo is used as the primary action color:

```
Primary 600: #4f46e5  (main actions, links)
Primary 700: #4338ca  (hover state)
```

### Status Colors
```
Success:  #059669 (green)
Error:    #dc2626 (red)
Warning:  #f59e0b (amber)
Info:     #3b82f6 (blue)
```

---

## Typography

### Font Stack
All text uses system fonts for optimal performance:
```
-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif
```

### Type Scale

| Size | Use Case | Weight | Line Height | Letter Spacing |
|------|----------|--------|-------------|----------------|
| 48px | Display/Hero | 700 | 1.2 | -0.02em |
| 36px | Display Alt | 700 | 1.3 | -0.02em |
| 32px | H1/Page Title | 700 | 1.4 | -0.01em |
| 24px | H2/Section | 700 | 1.4 | -0.01em |
| 20px | H3/Subsection | 600 | 1.5 | 0em |
| 18px | H4/Label | 600 | 1.5 | 0em |
| 18px | Body Large | 400 | 1.6 | 0em |
| 16px | Body (default) | 400 | 1.6 | 0em |
| 14px | Body Small | 400 | 1.6 | 0em |
| 14px | Button Text | 600 | 1.4 | 0em |
| 12px | Label/Caption | 600 | 1.4 | 0.05em |
| 11px | Micro Caption | 500 | 1.4 | 0.05em |

---

## Spacing System

Based on 8px base unit:

```
0:   0px
1:   4px   (minimal gaps, micro spacing)
2:   8px   (standard gap)
3:   12px  (small gaps)
4:   16px  (standard padding)
5:   20px  (medium padding)
6:   24px  (comfortable padding)
8:   32px  (large sections)
10:  40px  (section spacing)
12:  48px  (major section spacing)
16:  64px  (hero/page spacing)
24:  96px  (full screen spacing)
```

### Common Patterns

- **Card Padding:** 24px (6 on all sides)
- **Button Padding:** 16px horizontal, 8px vertical (4 × 2)
- **Page Padding:** 24px-32px (6-8)
- **Gap Between Items:** 8px-12px (2-3)

---

## Border Radius

Professional, consistent border radius values:

```
none: 0      (no radius)
sm:   4px    (minimal)
base: 6px    (buttons, small elements)
md:   8px    (cards, inputs)
lg:   12px   (larger cards, modals)
xl:   16px   (hero sections - rare)
full: 9999px (only for avatars/pills)
```

**Rules:**
- Buttons: `rounded-md` (6px) or `rounded-lg` (8px)
- Cards: `rounded-lg` (8px)
- Inputs: `rounded-md` (6px)
- Modals: `rounded-lg` (8px)
- Avatars: `rounded-full` (circle)
- Large sections: `rounded-lg` (8px)

---

## Shadows

Subtle shadows for depth without excessive visual weight:

```
xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)
md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)
lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)
```

**Usage:**
- Default cards: `shadow-sm`
- Hover cards: `shadow-md`
- Modals/dropdowns: `shadow-lg`
- No excessive shadows

---

## Components

### Buttons

**Variants:**
- `primary` - Main action (indigo background)
- `secondary` - Alternative action (gray background)
- `outline` - Less prominent action (bordered)
- `ghost` - Minimal action (text only)
- `danger` - Destructive action (red background)

**Sizes:**
- `sm` - Small (12px text, 6px padding)
- `md` - Medium (14px text, 8px padding) - default
- `lg` - Large (16px text, 12px padding)

**Example:**
```jsx
<Button variant="primary" size="md">Click Me</Button>
<Button variant="secondary" fullWidth>Full Width</Button>
<Button variant="ghost">Minimal</Button>
```

### Cards

**Structure:**
- Border: `border border-gray-200` (light), `border-gray-800` (dark)
- Background: `bg-white` (light), `bg-gray-950` (dark)
- Padding: 24px (6 all sides)
- Border radius: `rounded-lg` (8px)
- Shadow: `shadow-sm` (hover: `shadow-md`)

**With Header:**
```jsx
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

### Inputs & Forms

**Styling:**
- Border: `border border-gray-300` (light), `border-gray-700` (dark)
- Padding: `px-3 py-2` (12px × 8px)
- Border radius: `rounded-md` (6px)
- Focus: `focus:ring-2 focus:ring-indigo-500`
- Font size: 16px (prevents zoom on mobile)

### Navigation

**Header:**
- Fixed positioning
- Subtle border bottom
- Logo + navigation + profile
- Responsive: hidden on mobile, visible on desktop

**Active States:**
- No accent underline; use hover background
- Hover: `hover:bg-gray-100` (light), `hover:bg-gray-800` (dark)

### Modals & Dropdowns

**Modals:**
- Backdrop: `bg-black/50`
- Card: `rounded-lg` with `shadow-lg`
- Centered on screen
- Close button (top right)

**Dropdowns:**
- Positioned absolutely below trigger
- Rounded corner: `rounded-lg`
- Shadow: `shadow-lg`
- 200-300px width typical

---

## Interactions & Transitions

### Transition Timings
```
subtle: 0.15s (quick UI feedback)
base:   0.2s  (default interactions)
smooth: 0.3s  (longer animations)
```

### Hover States
- **Buttons:** Background color change, no scale or lift
- **Cards:** Subtle shadow change (`shadow-sm` → `shadow-md`)
- **Links:** Text color change or underline addition
- **Inputs:** Border color change, focus ring

### Focus States
- Clear focus ring (3px, indigo)
- Visible on all interactive elements
- High contrast for accessibility

### Loading States
- Spinner or skeleton
- Button text change ("Loading..." or icon)
- Disabled state: `opacity-50 cursor-not-allowed`

---

## Dark Mode

The system fully supports dark mode with specific color mappings:

```css
/* Light mode (default) */
background: #ffffff
text: #000000
borders: #e5e7eb

/* Dark mode */
body.theme-dark {
  background: #000000
  color: #ffffff
}
```

**Cards in dark mode:**
- Background: `bg-gray-950`
- Border: `border-gray-800`
- Text: `text-white`

---

## Layout Patterns

### Container
```jsx
<div className="max-w-7xl w-full mx-auto px-4 sm:px-6">
```

### Spacing Between Sections
- Desktop: 64px-96px (16-24)
- Mobile: 32px-48px (8-12)

### Grid System
- Use Tailwind's responsive grid
- Typical: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Gap: `gap-4` to `gap-6` (16-24px)

---

## What Was Removed

### ❌ Removed "AI Vibe" Elements
- Excessive rounded corners (no `rounded-full` except avatars/pills)
- Particle animations
- Glowing effects and text-shadows
- Gradient text overuse
- Glassmorphism effects
- Floating/pulsing animations
- Overly colorful elements
- Inconsistent component styles

### ✅ Replaced With
- Clean, minimal aesthetic
- Clear visual hierarchy
- Consistent component system
- Professional spacing and typography
- Subtle, purposeful interactions
- Accessibility-first design

---

## Implementation Guidelines

### When Building New Components

1. **Start with the grid/spacing:** Use 8px-based spacing
2. **Apply typography:** Use appropriate size from scale
3. **Add border and color:** Use gray palette for borders/backgrounds
4. **Implement interactions:** Subtle hover/focus states
5. **Test accessibility:** Color contrast, keyboard nav, focus states

### Common Mistakes to Avoid

- ❌ Using `rounded-full` on buttons/cards (use `rounded-lg`)
- ❌ Adding unnecessary shadows or blur effects
- ❌ Inconsistent padding across components
- ❌ Using multiple accent colors (stick to indigo)
- ❌ Overly long animations (keep under 0.3s)
- ❌ Low text contrast in dark mode
- ❌ Mixing rounded and sharp corners

### Best Practices

- ✅ Use the design tokens consistently
- ✅ Leverage Tailwind's utility classes
- ✅ Test in both light and dark mode
- ✅ Ensure 4.5:1 contrast ratio
- ✅ Keep hover states subtle
- ✅ Use consistent spacing scales
- ✅ Make interactive elements obvious

---

## Migration Guide

### Updating Existing Components

**Old Button:**
```jsx
className="rounded-full px-4 py-2 bg-pink-500 shadow-glow"
```

**New Button:**
```jsx
<Button variant="primary" size="md">Click Me</Button>
```

**Old Card:**
```jsx
className="glass rounded-2xl backdrop-blur bg-white/10 border-white/10"
```

**New Card:**
```jsx
<Card>
  <CardContent>Content</CardContent>
</Card>
```

**Old Colors:**
```jsx
text-white/80    → text-gray-600 (light) / text-gray-300 (dark)
bg-white/5       → bg-gray-50 (light) / bg-gray-800 (dark)
border-white/10  → border-gray-200 (light) / border-gray-800 (dark)
```

---

## Resources

- **Design Tokens:** `src/lib/designTokens.ts`
- **Button Component:** `src/components/ui/Button.tsx`
- **Card Component:** `src/components/ui/Card.tsx`
- **Global Styles:** `src/index.css`

---

## Questions?

Refer to the design tokens file or examine working components for implementation patterns.

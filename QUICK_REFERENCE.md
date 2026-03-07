# PawnPoint Design System - Quick Reference

## Color Palette

### Primary
- **Indigo 600:** `#4f46e5` (actions, links)
- **Indigo 700:** `#4338ca` (hover)

### Grays (Light Mode)
- **50:** `#f9fafb` (backgrounds)
- **100:** `#f3f4f6` (light bg)
- **200:** `#e5e7eb` (borders)
- **300:** `#d1d5db` (subtle borders)
- **400-500:** secondary text
- **600-700:** headings
- **800-900:** dark text

### Grays (Dark Mode)
- **700:** `#374151` (dark hover)
- **800:** `#1f2937` (dark cards)
- **900:** `#111827` (dark bg)
- **950:** `#030712` (darkest)

### Status
- **Success:** `#059669` (green)
- **Error:** `#dc2626` (red)
- **Warning:** `#f59e0b` (amber)
- **Info:** `#3b82f6` (blue)

---

## Spacing Scale (8px Base)

```
p-1 = 4px    p-4 = 16px   p-8 = 32px
p-2 = 8px    p-5 = 20px   p-10 = 40px
p-3 = 12px   p-6 = 24px   p-12 = 48px
```

---

## Typography

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Display | 48px | 700 | 1.2 |
| H1 | 32px | 700 | 1.4 |
| H2 | 24px | 700 | 1.4 |
| H3 | 20px | 600 | 1.5 |
| Body | 16px | 400 | 1.6 |
| Small | 14px | 400 | 1.6 |
| Label | 12px | 600 | 1.4 |

---

## Border Radius

```
rounded-md = 6px   (buttons, inputs)
rounded-lg = 8px   (cards, modals)
rounded-full = 9999px (avatars only)
```

---

## Shadows

```
shadow-sm = subtle
shadow-md = moderate
shadow-lg = prominent
```

---

## Components

### Button
```jsx
<Button variant="primary|secondary|outline|ghost|danger"
        size="sm|md|lg"
        fullWidth={true} />
```

### Card
```jsx
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Progress
```jsx
<Progress value={75} />
```

---

## Common Classes

### Text Colors
```
text-gray-900 (light mode dark)
text-gray-700 (light mode medium)
text-gray-600 (light mode light)
dark:text-white (dark mode light)
dark:text-gray-300 (dark mode medium)
```

### Background Colors
```
bg-white (light card)
bg-gray-50 (light bg)
dark:bg-gray-950 (dark bg)
dark:bg-gray-800 (dark card)
```

### Border Colors
```
border-gray-200 (light)
border-gray-300 (light subtle)
dark:border-gray-800 (dark)
dark:border-gray-700 (dark subtle)
```

---

## Common Patterns

### Card with Header
```jsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    Content here
  </CardContent>
</Card>
```

### Form Section
```jsx
<div className="space-y-6">
  <div className="space-y-2">
    <label className="text-sm font-semibold">Label</label>
    <input className="w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700" />
  </div>
</div>
```

### Button Group
```jsx
<div className="flex gap-3">
  <Button variant="primary" fullWidth>Primary</Button>
  <Button variant="secondary" fullWidth>Secondary</Button>
</div>
```

### Navigation Item
```jsx
<a className="rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
  Link
</a>
```

---

## Migration Cheat Sheet

| Old | New |
|-----|-----|
| `rounded-full` | `rounded-md` (buttons) or `rounded-lg` (cards) |
| `rounded-2xl` | `rounded-lg` |
| `rounded-xl` | `rounded-md` or `rounded-lg` |
| `text-white/80` | `text-gray-600` / `dark:text-gray-300` |
| `text-white/60` | `text-gray-700` / `dark:text-gray-400` |
| `bg-white/5` | `bg-gray-50` / `dark:bg-gray-800` |
| `bg-white/10` | `bg-gray-100` / `dark:bg-gray-700` |
| `border-white/10` | `border-gray-200` / `dark:border-gray-800` |
| `shadow-glow` | `shadow-sm` |
| `backdrop-blur` | Remove |
| `gradient text` | Plain text |

---

## Dark Mode

All components automatically support dark mode with `dark:` prefix.

```jsx
<div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
  Content
</div>
```

---

## Do's and Don'ts

### ✅ DO
- Use `rounded-md` / `rounded-lg`
- Use spacing scale (p-2, p-4, p-6)
- Use gray color palette
- Use `<Button>` component
- Use `<Card>` component
- Test light & dark mode
- Keep animations under 0.3s

### ❌ DON'T
- Use `rounded-full` on buttons/cards
- Use custom spacing
- Mix accent colors
- Use inline styles
- Use `text-white/X` hacks
- Add excessive shadows
- Use glassmorphism
- Animate particles/glows

---

## Resources

- Full Guide: `DESIGN_SYSTEM.md`
- Summary: `REDESIGN_SUMMARY.md`
- Implementation: `IMPLEMENTATION_GUIDE.md`
- Tokens: `src/lib/designTokens.ts`
- Components: `src/components/ui/`

---

## Questions?

Refer to the comprehensive guides or examine reference components.

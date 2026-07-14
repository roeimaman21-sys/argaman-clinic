# Argaman Design System v1.0

> **Single source of truth** for visual decisions in קליניקת ארגמן.
> All tokens live in `design-tokens.css` and load **before** `style.css` / `admin.css` on every page.

---

## Hierarchy

```
design-tokens.css  ←  Tokens only (variables in :root)
       ↓
style.css          ←  Public site components (consumes tokens)
admin.css          ←  CRM components (consumes tokens)
```

Cascade layers declared in order: `reset, tokens, base, layout, components, utilities, overrides`.

---

## Color

### Primary scales (sRGB-anchored)

| Token | Hex | Use |
|---|---|---|
| `--navy-50` | `#EEF2F8` | tints, lightest |
| `--navy-100` | `#D4DEEB` | hover surface |
| `--navy-500` | **`#1B3A6B`** | brand anchor |
| `--navy-800` | `#0F2347` | footer-dark |
| `--navy-900` | `#08152B` | deepest |
| `--gold-50` | `#FAF6E9` | warm tint |
| `--gold-500` | **`#C9A84C`** | brand accent |
| `--gold-700` | `#A8882E` | hover state |

### Semantic colors

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#F8F8F8` | page background |
| `--color-surface` | `#FFFFFF` | cards |
| `--color-text` | `#1A1A1A` | body text |
| `--color-text-muted` | `#555555` | secondary text |
| `--color-border` | `#E0E0E0` | dividers |
| `--color-focus` | `var(--gold-500)` | focus ring |
| `--color-success` | `var(--green-500)` | success states |
| `--color-danger` | `var(--red-500)` | error states |

### Backward-compat aliases

These are kept so the existing 200+ HTML files keep rendering identically:

| Legacy | Resolves to |
|---|---|
| `--color-primary` | `--navy-500` |
| `--color-gold` | `--gold-500` |
| `--navy` | `--navy-500` |
| `--gold` | `--gold-500` |
| `--bg`, `--text`, `--muted`, `--border` | semantic equivalents |

### Perceptual scale (LCH, opt-in)

For new components that benefit from perceptually-uniform color steps, use:
- `--navy-perceptual-50` … `--navy-perceptual-900`
- `--gold-perceptual-50` … `--gold-perceptual-900`

These exist only when the browser supports `lch()` (Chrome 111+, Safari 16.4+, Firefox 113+).

---

## Typography

### Fluid type scale

All sizes use `clamp()` so they adapt smoothly from 320px to 1920px viewports.

| Token | Range | Use |
|---|---|---|
| `--text-2xs` | 11–12px | micro labels |
| `--text-xs` | 12–13px | badges, eyebrow |
| `--text-sm` | 14–15px | secondary text |
| `--text-base` | 16–17px | body |
| `--text-lg` | 17–20px | lead paragraph |
| `--text-xl` | 20–24px | h4 |
| `--text-2xl` | 24–29px | h3 |
| `--text-3xl` | 29–38px | h2 |
| `--text-4xl` | 35–48px | h1 |
| `--text-5xl` | 45–64px | display |
| `--text-display` | 56–88px | hero |

### Weights

`--fw-regular: 400`, `--fw-medium: 500`, `--fw-semibold: 600`, `--fw-bold: 700`, `--fw-extrabold: 800`, `--fw-black: 900`.

### Line heights

`--leading-tight: 1.15`, `--leading-snug: 1.30`, `--leading-normal: 1.50`, `--leading-relaxed: 1.70`, `--leading-loose: 1.90`.

### Tracking

`--tracking-tighter: -0.02em`, `--tracking-tight: -0.01em`, `--tracking-normal: 0`, `--tracking-wide: 0.025em`, `--tracking-wider: 0.05em`, `--tracking-widest: 0.10em`.

---

## Spacing

4px base scale, 16 steps:

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |
| `--space-20` | 80px |
| `--space-24` | 96px |
| `--space-32` | 128px |
| `--space-48` | 192px |
| `--space-64` | 256px |

---

## Radius

`--radius-sm: 6px`, `--radius: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`, `--radius-xl: 24px`, `--radius-2xl: 32px`, `--radius-full: 9999px`.

Legacy aliases: `--r: 10px`, `--r-sm: 6px`, `--r-lg: 14px`.

---

## Shadows (navy-tinted)

All elevations use `rgba(15, 35, 71, …)` for a premium navy tint.

| Token | Use |
|---|---|
| `--shadow-xs` | hairline lift |
| `--shadow-sm` | card resting |
| `--shadow-md` | card hover |
| `--shadow-lg` | dropdown, popover |
| `--shadow-xl` | modal |
| `--shadow-2xl` | hero / floating CTA |
| `--shadow-inner` | inset (e.g. inputs) |
| `--shadow-gold-glow` | gold focus halo |

---

## Z-index scale

| Token | Value |
|---|---|
| `--z-base` | 0 |
| `--z-dropdown` | 1000 |
| `--z-sticky` | 1100 |
| `--z-navbar` | 1200 |
| `--z-overlay` | 1300 |
| `--z-modal` | 1400 |
| `--z-popover` | 1500 |
| `--z-toast` | 1600 |
| `--z-tooltip` | 1700 |
| `--z-cookie` | 1800 |

---

## Motion

### Durations

`--motion-instant: 0ms`, `--motion-fast: 150ms`, `--motion: 250ms`, `--motion-medium: 350ms`, `--motion-slow: 500ms`, `--motion-slower: 700ms`.

### Easings

| Token | Curve | Use |
|---|---|---|
| `--ease-linear` | `linear` | progress bars |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | exits |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | entrances |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | sync motions |
| `--ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | hero / page transitions |
| `--ease-bounce` | `cubic-bezier(0.5, 1.5, 0.5, 1)` | playful confirmations |
| `--ease-spring` | `cubic-bezier(0.5, 1.4, 0.5, 1)` | hover lifts |

---

## Layout

`--container-max: 1200px`, `--container-pad: 1.25rem`, `--content-narrow: 65ch`, `--content-wide: 85ch`, `--nav-height: 70px`.

## Breakpoints

`--bp-sm: 30em` (480px), `--bp-md: 48em` (768px), `--bp-lg: 64em` (1024px), `--bp-xl: 80em` (1280px), `--bp-2xl: 96em` (1536px).

---

## Global polish (auto-applied)

`design-tokens.css` adds these site-wide on load:

1. **Branded selection** — gold tint background, navy text
2. **Branded scrollbar** — thin gray track, navy thumb, gold on hover (desktop only)
3. **Focus ring** — keyboard-only visible (`:focus-visible`), 3px gold, offset 2px
4. **Sticky-header scroll offset** — `scroll-padding-top` matches `--nav-height`
5. **Reduced motion** — site-wide override when `prefers-reduced-motion: reduce`

---

## Versioning

Current: **v1.0** (2026-05-19)

Breaking changes bump major. Token additions bump minor. Internal cleanups bump patch.

---

## Authoring guidance

1. **Always prefer tokens** over magic numbers. If you reach for a literal `16px`, see if `--space-4` fits.
2. **New colors? extend the scale** rather than introducing one-off hex values. Coordinate via this doc.
3. **New tokens go in `design-tokens.css`** — never inline overrides in component CSS.
4. **Legacy aliases stay** until the next major refactor. Adding them is fine; removing requires migration.
5. **Test in `@layer components`** for new component styles — predictable cascade, no `!important` needed.

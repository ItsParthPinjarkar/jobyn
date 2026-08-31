# Data Density Philosophy — Jobyn

## Core Principle

Every element must earn its space. If it doesn't inform a decision, remove it.

Premium dashboards balance three competing forces:
- **Whitespace** — breathing room, hierarchy, calm
- **Density** — information, utility, power
- **Clarity** — comprehension, speed, confidence

Too much whitespace = feels empty, wastes screen.
Too much density = overwhelming, hard to scan.
Just right = scannable at a glance, deep on inspection.

---

## Card System

### Metric Cards
- Max 4 per row (lg: 1440px), 2 (md: 768px), 1 (sm: 375px)
- Padding: 20px desktop, 16px mobile
- Internal spacing: 12px between elements
- Content: icon + label + value + delta (4 elements max)

### Content Cards
- Padding: 24px desktop, 20px mobile
- Header: 16px from body content
- Footer: 16px from body content, top border at 1px
- Max 3 content blocks per card before it should be split

### Interactive Cards
- Hover: translateY(-2px) + border glow
- Active: reduced lift (translateY(-1px))
- Focus: 2px accent ring

---

## Typography Hierarchy in Cards

```
┌─────────────────────────┐
│ [icon] Card Title       │  ← H4, 18px, Clash Display 600
│                         │
│     $2,847.50           │  ← Display, 32px, DM Mono 500
│     +12.5% from last    │  ← Small, 13px, Satoshi 400, green
│     month               │
│                         │
│ [View Details →]        │  ← Caption, 12px, accent color
└─────────────────────────┘
```

4 levels max: Title → Value → Context → Action

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Inline gaps, icon margins |
| `--space-2` | 8px | Tight groups, label-value pairs |
| `--space-3` | 12px | Card internal spacing |
| `--space-4` | 16px | Card padding (mobile) |
| `--space-5` | 20px | Card padding (desktop) |
| `--space-6` | 24px | Section padding |
| `--space-8` | 32px | Section margins |
| `--space-10` | 40px | Large section gaps |
| `--space-12` | 48px | Hero spacing |
| `--space-16` | 64px | Page section dividers |

---

## Table Density

### Compact (default for data tables)
- Row height: 40px
- Cell padding: 8px 12px
- Font size: 13px
- Header: 44px, background surface-elevated, font-weight 600

### Comfortable (for detail views)
- Row height: 48px
- Cell padding: 12px 16px
- Font size: 14px
- Header: 48px

### Zebra Striping
- Use `--surface` and `--surface-elevated` alternating
- Subtle: only 2-3% lightness difference
- Optional: can be toggled off

---

## Chart Density

### Rules
- Labeled axes: ALWAYS (no unlabeled numbers)
- Gridlines: 8% opacity, dashed
- Data lines: 2px weight, solid
- Max 3 series per chart
- Legend: inline below chart, not floating overlay
- No 3D, no shadows on data, no chartjunk
- Hover tooltips: compact, single-line values

### Responsive
- Desktop: full labels, full legend
- Tablet: abbreviated labels, inline legend
- Mobile: minimal labels, hidden legend (use color-coded inline indicators)

---

## List Density

### Compact List (skills, tasks, items)
- Item height: 36px
- Padding: 8px 12px
- Icon + Label + Action (3 elements max per row)

### Comfortable List (settings, navigation)
- Item height: 44px
- Padding: 12px 16px
- Icon + Label + Description + Action (4 elements max)

---

## Information Budget

Before adding any element to a UI, answer:
1. What decision does this help the user make?
2. Can this be combined with an existing element?
3. Does this need to be visible by default, or can it be in a detail view?
4. Would removing this make the page harder to use?

If the answer to #4 is "no" — remove it.

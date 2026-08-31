# Design Context for Agents

## Design Tokens (Light Theme - Default)
- Background: #FAF8F5 (warm alabaster)
- Surface/Card: #FFFFFF
- Surface Elevated: #F3ECE3 (soft sandstone)
- Primary: #A84832 (warm copper terracotta)
- Accent: #0F766E (deep teal/emerald)
- Success/Mint: #10B981
- Warning/Amber: #F59E0B
- Destructive/Crimson: #EF4444
- Text Primary/Foreground: #1E1B18 (dark walnut)
- Text Muted: #5C5650 (taupe slate)
- Border: #EFEBE4
- Input: #EFEBE4
- Sidebar: #FFFFFF

## Fonts
- Headings: Clash Display (font-heading)
- Body: Satoshi (font-sans)
- Code/Data: DM Mono (font-mono)

## Shadcn Components Available
All imported from `@/components/ui/[name]`:
- button (Button, buttonVariants)
- card (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- input (Input)
- badge (Badge)
- dialog (Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter)
- tabs (Tabs, TabsList, TabsTrigger, TabsContent)
- select (Select, SelectTrigger, SelectValue, SelectContent, SelectItem)
- avatar (Avatar, AvatarFallback)
- tooltip (Tooltip, TooltipTrigger, TooltipContent, TooltipProvider)
- skeleton (Skeleton)
- progress (Progress)
- separator (Separator)
- scroll-area (ScrollArea, ScrollBar)
- dropdown-menu (DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator)
- label (Label)
- textarea (Textarea)
- switch (Switch)
- sonner (Toaster)
- sheet (Sheet, SheetTrigger, SheetContent, SheetTitle)
- command (Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem)
- input-group (InputGroup, InputGroupText)

## Utility
```tsx
import { cn } from "@/lib/utils"
```

## Animation Pattern
```tsx
import { motion } from 'framer-motion'
<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
```

## Existing Primitives (in src/components/primitives/)
```tsx
import { FadeIn, StaggerContainer, StaggerItem, HoverLift, GlowBorder, MagneticButton } from '@/components/primitives/motion'
import { SectionContainer, GridSystem, ContentRail, BentoLayout, PageHeader } from '@/components/primitives/layout'
import { GlassCard, MetricCard, FloatingPanel, SpotlightCard, DataCard } from '@/components/primitives/surface'
import { EmptyState, ErrorState, LoadingSkeleton, SuccessState, InlineStatus } from '@/components/primitives/feedback'
import { ProgressRing, SparkLine, ReadinessIndicator, SkillBar, ScoreGauge } from '@/components/primitives/viz'
```
- FadeIn: scroll-triggered fade+blur animation with delay prop
- StaggerContainer + StaggerItem: staggered children animations
- HoverLift: hover Y translation
- GlowBorder: focus-within glow ring
- MetricCard: pre-built metric display card
- ProgressRing: SVG circular progress
- SparkLine: mini line chart
- ScoreGauge: score visualization
- SkillBar: horizontal skill progress bar

## CSS Utility Classes
- `glow-cyan` - soft tinted glow shadow (legacy name)
- `glow-border` - subtle glowing border
- `gradient-accent` - indigo-to-violet gradient background
- `gradient-text` - gradient text (deep indigo)
- `glass` - glass morphism effect
- `premium-hover-card` / `premium-hover-pill` - warm lift-on-hover transitions

## Tailwind Custom Colors (legacy names, current values)
- `text-cyan`, `bg-cyan` - #C2593F (copper)
- `text-violet`, `bg-violet` - #0F766E (teal)
- `text-mint`, `bg-mint` - #10B981
- `text-crimson`, `bg-crimson` - #EF4444
- `text-amber`, `bg-amber` - #F59E0B
- `bg-surface`, `bg-surface-elevated`

## Context Hooks
```tsx
import { useAuth } from '@/context/AuthContext'
// { user: { name, email, isAdmin }, login, signup, loginWithGoogle, logout, loading }

import { useResume } from '@/context/ResumeContext'
// { analysis, prediction, bestFit, masteredSkills, completedTasks, dailyCommitment, currentFile, setAnalysis, setPrediction, markSkillMastered, toggleTask, setDailyCommitment, clear, loading }

import { useToast } from '@/context/ToastContext'
// { toast(message, type?: 'success'|'error'|'info'|'warning') }

import { usePrivacy } from '@/context/PrivacyContext'
// { privacy }
```

## API Client
```tsx
import { uploadResume, predictResume, getAnalytics, getLatestSession, BASE } from '@/api/client'
```

## Design Principles
1. Data speaks first - lead with most important number/insight
2. Earned familiarity - use established patterns, execute at higher level
3. Density matches intent - dense for dashboards, breathing room for auth/landing
4. Motion with purpose - 150-300ms, ease-out, never blocking
5. Light by default (warm copper theme), readable always - 4.5:1 contrast minimum

## Typography Rules
- h1: Clash Display, 2.25rem, 700 weight
- h2: Clash Display, 1.75rem, 700 weight
- h3: Clash Display, 1.375rem, 600 weight
- Body: Satoshi, 0.875rem, 400 weight
- All headings use font-heading (Clash Display), letter-spacing -0.02em
- Never use Inter/Roboto/Arial for display text

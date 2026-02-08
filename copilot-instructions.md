# Copilot Instructions for LifeTrack

## Project Overview
LifeTrack is a self-development tracking application where users can:
- Track learning skills and progress
- Log practice sessions with an activity timer
- Visualize progress with GitHub-style heatmaps
- Manage activities across different skills

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4 with custom CSS properties
- **State Management**: Zustand with localStorage persistence
- **Forms**: react-hook-form + Zod validation
- **Icons**: lucide-react
- **Animations**: framer-motion
- **Runtime**: Bun (for package management and development)

## Project Structure
```
lifetrack_front/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx           # Root layout with Shell and ToastContainer
│   ├── page.tsx             # Home page
│   ├── activities/          # Activities management page
│   └── skill-map/           # Skills pages
├── components/              # React components
│   ├── ui/                  # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── PageHeader.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Pagination.tsx
│   │   └── Toast.tsx
│   ├── ActivityTimer.tsx    # Session timer with start/pause/stop
│   ├── ActivityHeatmap.tsx  # GitHub-style activity visualization
│   ├── ActivityForm.tsx     # Create/edit activity form
│   ├── ActivityList.tsx     # Paginated activity list
│   ├── SkillList.tsx        # Paginated skill list
│   ├── Sidebar.tsx          # Navigation sidebar
│   └── Shell.tsx            # App layout shell
├── stores/                  # Zustand state stores
│   ├── activityStore.ts     # Activities and active session state
│   └── toastStore.ts        # Toast notifications state
├── lib/                     # Utilities and data
│   ├── activities.ts        # Activity types and helpers
│   ├── skills.ts            # Skills data (mock)
│   └── schemas/
│       └── activity.ts      # Zod validation schemas
└── app/globals.css          # Design system & Tailwind imports
```

## Design System

### Color System (CSS Custom Properties)
We use HSL color values with CSS custom properties for theming:

```css
/* Usage in components */
bg-[hsl(var(--primary))]           /* Primary blue */
text-[hsl(var(--foreground))]      /* Text color */
border-[hsl(var(--border))]        /* Border color */
bg-[hsl(var(--success))]           /* Success green */
bg-[hsl(var(--danger))]            /* Danger red */
bg-[hsl(var(--muted))]             /* Muted background */
text-[hsl(var(--muted-foreground))]/* Muted text */
```

All colors automatically adapt to dark mode via `prefers-color-scheme`.

### Component Variants
UI components follow a consistent variant pattern:

**Button**: `primary`, `secondary`, `ghost`, `danger`
**Badge**: `default`, `success`, `warning`, `info`, `danger`
**Sizes**: `sm`, `md`, `lg`

### Spacing & Radius
Use design tokens for consistency:
```css
rounded-[var(--radius)]      /* Standard border radius */
rounded-[var(--radius-sm)]   /* Small radius */
rounded-[var(--radius-full)] /* Fully rounded (pills) */
```

## State Management Patterns

### Zustand Stores
**Always use Zustand for:**
- Cross-component state (activities, active session)
- Global UI state (toasts, modals)
- Data that needs localStorage persistence

**Pattern:**
```typescript
// In component
import { useActivityStore } from '@/stores/activityStore'
const { activities, createActivity } = useActivityStore()

// Selective subscription for performance
const activeSession = useActivityStore(state => state.activeSession)
```

### Component State
Use local `useState` for:
- Form inputs (unless using react-hook-form)
- UI toggles (expanded/collapsed)
- Pagination state
- Local-only state

## Component Patterns

### Client vs Server Components
- **Server Components** (default): Pages that fetch data, no interactivity
- **Client Components** (`'use client'`): Interactive components, hooks usage

**When to use `'use client'`:**
- Using React hooks (useState, useEffect, etc.)
- Event handlers (onClick, onChange)
- Accessing browser APIs
- Using Zustand stores

### Form Components
Use react-hook-form + Zod for all forms:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(mySchema)
})
```

### Empty States
Always show meaningful empty states:

```typescript
import EmptyState from '@/components/ui/EmptyState'

if (items.length === 0) {
  return (
    <EmptyState
      icon={<IconComponent size={48} />}
      title="No items yet"
      description="Helpful message"
      action={<Button>Add Item</Button>}
    />
  )
}
```

### Pagination
Use the Pagination component for lists:

```typescript
import Pagination from '@/components/ui/Pagination'

<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```

## Activity System

### Activity vs Skill
- **Skill**: A topic/area you're learning (e.g., "React", "Guitar")
- **Activity**: A practice session for a skill (timed or manual entry)

### Activity States
- `completed`: Finished session with recorded duration
- `active`: Currently running with timer
- `paused`: Session paused, can be resumed

### Session Timer Flow
1. User starts session: `startSession(skillId, name)`
2. Timer runs, can be paused/resumed
3. User stops: `stopSession(notes?)` → calculates duration → saves as completed

### Activity Storage
- Persisted in localStorage via Zustand middleware
- Key: `activities_v1`
- Automatically migrates old commitment data on first load

## Icon Usage

Use lucide-react icons consistently:

```typescript
import { Play, Pause, Calendar, Clock } from 'lucide-react'

<Button>
  <Play size={16} />
  Start
</Button>
```

Common sizes: 14px (inline), 16px (buttons), 20px (cards), 24px (headers), 48px (empty states)

## Accessibility Guidelines

### Focus States
All interactive elements must have visible focus states (handled globally):
```css
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

### ARIA Labels
Add aria-labels to icon-only buttons:
```typescript
<Button aria-label="Delete activity">
  <Trash2 size={16} />
</Button>
```

### Keyboard Navigation
- All forms support Enter key submission
- Pagination supports keyboard navigation
- Modal dialogs trap focus (if implemented)

## Performance Guidelines

### Selective Zustand Subscriptions
❌ Bad:
```typescript
const store = useActivityStore() // Re-renders on any store change
```

✅ Good:
```typescript
const activities = useActivityStore(state => state.activities)
```

### Memoization
Use `useMemo` for expensive computations:
```typescript
const sortedActivities = useMemo(() => 
  activities.sort((a, b) => new Date(b.date) - new Date(a.date)),
  [activities]
)
```

### List Rendering
Always add `key` prop with stable IDs:
```typescript
{items.map(item => (
  <Card key={item.id}>{item.name}</Card>
))}
```

## Animation Guidelines

Use framer-motion for animations:

```typescript
import { motion, AnimatePresence } from 'framer-motion'

// Entry/exit animations
<AnimatePresence>
  {show && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      Content
    </motion.div>
  )}
</AnimatePresence>
```

Use design system transitions:
```typescript
className="transition-all duration-[var(--transition-fast)]"
```

## Toast Notifications

Use the toast hook for user feedback:

```typescript
import { useToast } from '@/stores/toastStore'

const toast = useToast()

toast.success('Activity created!')
toast.error('Failed to save')
toast.info('Session paused')
toast.warning('Are you sure?')
```

## Routing

### Next.js App Router
- Use `Link` from `next/link` for navigation
- Dynamic routes: `[id]/page.tsx`
- All routes are in `app/` directory

### Navigation Structure
```
/                    # Home page
/skill-map           # Skills list
/skill-map/[id]      # Skill detail with timer & heatmap
/activities          # Activities dashboard
```

## Data Validation

All forms must use Zod schemas:

```typescript
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Required').max(100),
  duration: z.number().min(1).max(480),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})
```

## Common Patterns

### Date Formatting
```typescript
// Store dates as YYYY-MM-DD strings
const today = new Date().toISOString().split('T')[0]

// Display dates
new Date(dateString).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})
```

### Duration Formatting
```typescript
import { formatDuration } from '@/lib/activities'

formatDuration(90) // "1h 30m"
formatDuration(45) // "45m"
```

### Conditional Rendering
```typescript
// Prefer && for single condition
{isActive && <ActiveIndicator />}

// Use ternary for two branches
{isActive ? <Pause /> : <Play />}
```

## Testing Considerations

When writing tests:
- Mock localStorage for Zustand stores
- Test accessibility (focus states, keyboard navigation)
- Test form validation edge cases
- Test timer pause/resume logic
- Test activity CRUD operations

## Future Backend Integration

Current setup prepares for Go backend:
- Zustand store actions can be replaced with API calls
- Keep same interface: `createActivity()`, `updateActivity()`, etc.
- Replace localStorage with fetch calls
- Add loading/error states to components

## Common Commands

```bash
# Development
bun run dev

# Linting
bun run lint

# Build
bun run build

# Production server
bun run start
```

## Troubleshooting

### Build Errors
- Check for `'use client'` directive on components using hooks
- Verify all imports use absolute paths with `@/` prefix
- Ensure Zod schemas match form field names

### State Not Persisting
- Check localStorage key matches store name
- Verify Zustand persist middleware is configured
- Check browser localStorage limits

### Timer Issues
- Ensure `startedAt` is ISO timestamp
- Verify `pausedDuration` accumulates correctly
- Check interval cleanup in `useEffect`

## Code Style

- Use TypeScript for all files
- Prefer named exports for components
- Use arrow functions for components
- Keep components under 200 lines (extract logic)
- Sort imports: external → internal → relative
- Use destructuring in function parameters
- Prefer template literals for strings with variables
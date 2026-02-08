# LifeTrack Architecture

## Overview

LifeTrack is a self-development tracking application built with a modern frontend stack. The architecture is designed to be maintainable, scalable, and ready for backend integration with a Go GraphQL API.

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User Interface                     │
│              (Next.js App Router)                    │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────┴─────────────────────────────────┐
│              Component Layer                         │
│  - UI Primitives (Button, Card, Input)              │
│  - Feature Components (ActivityTimer, Heatmap)      │
│  - Layout Components (Shell, Sidebar)               │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────┴─────────────────────────────────┐
│            State Management Layer                    │
│        (Zustand Stores + localStorage)               │
│  - Activity Store (CRUD + Session Management)       │
│  - Toast Store (Notifications)                      │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────┴─────────────────────────────────┐
│              Data Layer                              │
│  - localStorage API (activities_v1)                 │
│  - Data Migration (commitments → activities)        │
│  - Future: REST/GraphQL API                         │
└─────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Framework
- **Next.js 16.1.1** (App Router)
  - Server components for static content
  - Client components for interactivity
  - File-based routing
  - Built-in optimization (images, fonts, code splitting)

### UI Layer
- **React 19.2.3**
  - Latest features and performance improvements
  - Suspense for data fetching (future use)
  - Automatic batching

- **Tailwind CSS v4**
  - Utility-first styling
  - Custom CSS properties for theming
  - Built-in dark mode support
  - PostCSS processing

### State Management
- **Zustand 5.0.11**
  - Minimal boilerplate
  - TypeScript-first
  - Middleware support (persist)
  - No Provider wrapping needed
  - ~1KB bundle size

### Form Handling
- **react-hook-form 7.71.1**
  - Performance optimized (less re-renders)
  - TypeScript support
  - Flexible validation

- **Zod 4.3.6**
  - TypeScript-first validation
  - Type inference
  - Composable schemas
  - Runtime validation

### UI Enhancements
- **lucide-react 0.563.0**
  - Consistent icon library
  - Tree-shakeable
  - TypeScript support

- **framer-motion 12.33.0**
  - Smooth animations
  - Gesture support
  - Layout animations
  - AnimatePresence for enter/exit

### Runtime & Tooling
- **Bun**
  - Fast package installation
  - JavaScript runtime
  - Built-in TypeScript support

## Project Structure

### Directory Organization

```
lifetrack_front/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout (Shell + ToastContainer)
│   ├── page.tsx                 # Home page
│   ├── globals.css              # Design system + Tailwind
│   ├── activities/              # Activities feature
│   │   └── page.tsx            # Activities dashboard
│   └── skill-map/               # Skills feature
│       ├── page.tsx            # Skills list
│       └── [id]/               # Dynamic skill detail
│           └── page.tsx
│
├── components/                   # React components
│   ├── ui/                      # UI primitives (reusable)
│   │   ├── Button.tsx          # Button with variants
│   │   ├── Input.tsx           # Input/Textarea
│   │   ├── Card.tsx            # Card layout
│   │   ├── Badge.tsx           # Status badges
│   │   ├── Avatar.tsx          # User avatar
│   │   ├── PageHeader.tsx      # Page title/description
│   │   ├── EmptyState.tsx      # Empty state UI
│   │   ├── Skeleton.tsx        # Loading skeleton
│   │   ├── Pagination.tsx      # Pagination controls
│   │   └── Toast.tsx           # Toast notifications
│   │
│   ├── ActivityTimer.tsx        # Session timer (start/pause/stop)
│   ├── ActivityHeatmap.tsx      # GitHub-style activity visualization
│   ├── ActivityForm.tsx         # Activity create/edit form
│   ├── ActivityList.tsx         # Activity list with pagination
│   ├── SkillList.tsx            # Skills list with pagination
│   ├── Sidebar.tsx              # Navigation sidebar
│   └── Shell.tsx                # App layout wrapper
│
├── stores/                       # Zustand state stores
│   ├── activityStore.ts         # Activity state + session management
│   └── toastStore.ts            # Toast notification state
│
├── lib/                          # Utilities & business logic
│   ├── activities.ts            # Activity types & helpers
│   ├── skills.ts                # Skills data (mock)
│   └── schemas/
│       └── activity.ts          # Zod validation schemas
│
└── hooks/                        # Custom React hooks (future)
```

## Data Models

### Activity
```typescript
type Activity = {
  id: string                    // Unique identifier
  skillId: string              // Reference to skill
  name: string                 // Activity name
  duration: number             // Duration in minutes
  date: string                 // YYYY-MM-DD format
  notes?: string               // Optional notes
  status: 'completed' | 'active' | 'paused'
  startedAt?: string           // ISO timestamp (for active sessions)
  pausedAt?: string            // ISO timestamp (when paused)
  pausedDuration?: number      // Accumulated pause time (ms)
  createdAt: string            // ISO timestamp
}
```

### Skill
```typescript
type Skill = {
  id: string
  name: string
  level?: 'Beginner' | 'Intermediate' | 'Advanced'
  notes?: string
}
```

## State Management Architecture

### Activity Store

The activity store is the central state management for all activity-related operations:

```typescript
type ActivityState = {
  // State
  activities: Activity[]
  activeSession: Activity | null
  migrated: boolean
  
  // CRUD Operations
  createActivity: (input) => Activity
  updateActivity: (id, input) => void
  deleteActivity: (id) => void
  getActivityById: (id) => Activity | undefined
  listActivities: (skillId?) => Activity[]
  getActivitiesByDateRange: (start, end, skillId?) => Activity[]
  
  // Session Management
  startSession: (skillId, name) => Activity
  pauseSession: () => void
  resumeSession: () => void
  stopSession: (notes?) => void
  
  // Initialization
  initialize: () => void
}
```

**Key Features:**
- **Persistence**: Uses Zustand persist middleware with localStorage
- **Migration**: Automatically migrates old commitment data on first load
- **Session Lock**: Prevents multiple simultaneous active sessions
- **Duration Calculation**: Handles pause/resume time tracking
- **Optimistic Updates**: Immediate UI updates, localStorage sync

### Toast Store

Simple notification system:

```typescript
type ToastState = {
  toasts: Toast[]
  addToast: (message, type, duration?) => void
  removeToast: (id) => void
}
```

**Auto-dismiss**: Toasts automatically remove after 3 seconds (configurable)

## Component Architecture

### Component Hierarchy

```
RootLayout (layout.tsx)
├── Shell
│   ├── Sidebar
│   │   └── Navigation Links
│   └── Main Content Area
│       └── Page Components
└── ToastContainer (global)
```

### Component Categories

#### 1. UI Primitives (`components/ui/`)
Pure, reusable components with no business logic:
- Accept props for variants, sizes, states
- No direct state management (controlled components)
- Composable (Card > CardHeader > CardContent)
- Accessible by default

#### 2. Feature Components (`components/`)
Business logic components:
- Connect to Zustand stores
- Handle user interactions
- Manage local state
- Call validation schemas

#### 3. Layout Components
Structural components:
- Shell: App-wide layout
- Sidebar: Navigation
- PageHeader: Consistent page titles

#### 4. Page Components (`app/`)
Route-based components:
- Can be Server Components (default)
- Client Components when interactivity needed
- Fetch data (future: from API)
- Compose feature components

## Design System

### Color System

Built on CSS custom properties with HSL values for easy color manipulation:

```css
/* Light mode */
--primary: 217 91% 60%        /* Blue */
--success: 142 71% 45%        /* Green */
--danger: 0 84% 60%           /* Red */
--warning: 38 92% 50%         /* Orange */
--foreground: 0 0% 9%         /* Near black */
--background: 0 0% 100%       /* White */
--muted: 0 0% 96%             /* Light gray */
--border: 0 0% 90%            /* Border gray */

/* Dark mode (auto-applied via prefers-color-scheme) */
--primary: 217 91% 65%        /* Lighter blue */
--foreground: 0 0% 93%        /* Near white */
--background: 0 0% 4%         /* Near black */
--muted: 0 0% 10%             /* Dark gray */
--border: 0 0% 20%            /* Border gray */
```

**Usage in Tailwind:**
```typescript
className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
```

### Typography Scale
- Page titles: `text-3xl font-bold`
- Section headers: `text-2xl font-semibold`
- Card titles: `text-xl font-semibold`
- Subsections: `text-lg font-semibold`
- Body: `text-base`
- Captions: `text-sm`
- Fine print: `text-xs`

### Spacing System
- Container padding: `p-6` (24px)
- Card padding: `p-4` (16px)
- Element gaps: `gap-2` to `gap-6`
- Section margins: `mb-4` to `mb-8`

## Data Flow

### Activity Creation Flow

```
User fills form
    ↓
ActivityForm validates (Zod)
    ↓
Calls activityStore.createActivity()
    ↓
Store creates Activity object
    ↓
Adds to activities array
    ↓
Zustand persist middleware → localStorage
    ↓
Components re-render (subscribed to store)
    ↓
Toast notification shown
```

### Session Timer Flow

```
User clicks "Start Session"
    ↓
activityStore.startSession(skillId, name)
    ↓
Creates Activity with status='active', startedAt=now
    ↓
Sets as activeSession in store
    ↓
ActivityTimer component starts interval
    ↓
Every second: calculateDuration() updates display
    ↓
User clicks "Pause"
    ↓
Stores current pausedAt timestamp
    ↓
User clicks "Resume"
    ↓
Calculates paused duration, adds to pausedDuration
    ↓
User clicks "Stop"
    ↓
Calculates final duration, sets status='completed'
    ↓
Clears activeSession
    ↓
Activity saved to store → persisted to localStorage
```

## Performance Considerations

### Zustand Optimization
- Selective subscriptions to prevent unnecessary re-renders
- Shallow comparison for array/object updates
- Persist middleware batches localStorage writes

### React Optimization
- `useMemo` for expensive computations (sorting, filtering)
- `useCallback` for callback props (future optimization)
- Proper `key` props for list rendering
- Code splitting via dynamic imports (future)

### Bundle Size
Current approach:
- Tree-shakeable icons (lucide-react)
- Minimal store library (zustand ~1KB)
- No heavy dependencies
- Tailwind CSS purges unused styles

## Security Considerations

### Current (Client-Side)
- Data stored in localStorage (user's browser only)
- No authentication needed
- XSS protection via React's escaping
- Input validation with Zod

### Future (With Backend)
- HTTPS only
- JWT authentication
- CSRF protection
- Rate limiting on API
- Input sanitization server-side
- SQL injection prevention (parameterized queries)

## Scalability

### Current Scale
- Single user (localStorage)
- ~1000s of activities supported
- Browser localStorage limit: ~5-10MB

### Future Scale (With Backend)
- Multi-user support
- Database can handle millions of records
- API caching (Redis)
- CDN for static assets
- Database indexing on user_id, date fields
- Pagination at API level

## Migration Strategy

### Data Migration
On first load, automatically migrates old commitment data:

```typescript
// Old format (skill_commitments_v1)
{
  "skill-1": [
    { id: "1", date: "2026-01-01", text: "Practiced" }
  ]
}

// Converts to new format (activities_v1)
{
  activities: [
    {
      id: "migrated-1",
      skillId: "skill-1",
      name: "Practice session",
      duration: 30,
      date: "2026-01-01",
      notes: "Practiced",
      status: "completed",
      createdAt: "2026-01-01T00:00:00Z"
    }
  ]
}
```

**Migration runs once** (tracked by `migrated` flag in store)

## Future Backend Integration

### API Architecture (Planned)

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │ GraphQL/REST
         │
┌────────┴────────┐
│   Go Server     │
│                 │
│  - GraphQL API  │
│  - Auth (JWT)   │
│  - Validation   │
└────────┬────────┘
         │
┌────────┴────────┐
│   PostgreSQL    │
│                 │
│  - activities   │
│  - skills       │
│  - users        │
└─────────────────┘
```

### Migration Path
1. **Add API layer**: Keep Zustand stores, replace actions with API calls
2. **Add authentication**: JWT tokens, user context
3. **Migrate data**: Export from localStorage, import to DB
4. **Enable sync**: Real-time updates via WebSocket/SSE (optional)

### Example API Integration

**Before** (current):
```typescript
const createActivity = (input) => {
  const activity = { ...input, id: generateId(), createdAt: now() }
  set(state => ({ activities: [...state.activities, activity] }))
  return activity
}
```

**After** (with backend):
```typescript
const createActivity = async (input) => {
  const response = await fetch('/api/activities', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(input)
  })
  const activity = await response.json()
  set(state => ({ activities: [...state.activities, activity] }))
  return activity
}
```

## Testing Strategy (Future)

### Unit Tests
- Zustand stores (actions, state updates)
- Utility functions (formatDuration, calculateDuration)
- Zod schemas (validation logic)

### Component Tests
- UI primitives (Button, Input, Card)
- Feature components (ActivityTimer, Heatmap)
- User interactions (clicks, form submissions)

### Integration Tests
- Activity CRUD flow
- Timer session flow
- Data persistence
- Navigation

### E2E Tests
- Complete user journeys
- Create skill → Start session → Stop → View heatmap
- Cross-browser compatibility

## Deployment

### Current Setup (Development)
```bash
bun run dev      # Development server (port 3000)
bun run build    # Production build
bun run start    # Production server
```

### Future Production Deployment
- **Vercel**: Recommended for Next.js (built-in optimization)
- **Docker**: Containerize for custom hosting
- **CDN**: Static assets via Vercel Edge Network
- **Environment Variables**: API endpoints, feature flags

## Monitoring & Observability (Future)

- **Error Tracking**: Sentry for frontend errors
- **Analytics**: Plausible/Umami for privacy-friendly analytics
- **Performance**: Vercel Analytics, Web Vitals
- **Logging**: Server-side logging with structured logs

## Conclusion

LifeTrack is architected as a modern, maintainable web application with a clean separation of concerns. The current implementation uses localStorage for simplicity, but the architecture is designed to easily integrate with a backend API without major refactoring. The use of Zustand, Zod, and TypeScript provides type safety and maintainability, while Next.js and Tailwind enable rapid development with excellent performance.
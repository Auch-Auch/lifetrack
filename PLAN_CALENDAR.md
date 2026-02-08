# Calendar System Implementation Plan

## Overview

This plan details the implementation of a **generic calendar and event management system** for LifeTrack. The calendar will support:

- Generic events (not limited to skills/activities)
- Recurring events and scheduling
- Automatic learning plan pickup
- Telegram bot notifications
- Gmail Calendar integration

**Estimated Timeline**: 8-10 weeks

---

## Phase 1: Event Data Layer (Week 1-2)

### 1.1 Data Models

**lib/events.ts**
```typescript
// Core event types
export type EventType = 'activity' | 'learning' | 'meeting' | 'reminder' | 'custom';
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type NotificationChannel = 'browser' | 'telegram' | 'both';

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  allDay: boolean;
  
  // Recurrence
  recurrence: RecurrencePattern;
  recurrenceRule?: string; // RRULE format (RFC 5545)
  recurrenceEnd?: string;  // ISO 8601
  
  // Relations
  skillId?: string;        // Link to skill
  activityId?: string;     // Link to activity
  learningPlanId?: string; // Link to learning plan
  
  // Notifications
  notifications: {
    enabled: boolean;
    channels: NotificationChannel[];
    reminderMinutes: number[]; // [15, 60] = 15min and 1hr before
  };
  
  // Metadata
  color?: string;          // Hex color for calendar display
  location?: string;
  attendees?: string[];
  tags?: string[];
  
  // External sync
  gmailEventId?: string;   // For Gmail Calendar sync
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface LearningPlan {
  id: string;
  name: string;
  description?: string;
  skillIds: string[];
  
  // Scheduling preferences
  schedule: {
    frequency: 'daily' | 'weekly' | 'custom';
    durationMinutes: number;
    preferredTimes: string[]; // ["09:00", "14:00"]
    preferredDays: number[];  // [1, 2, 3, 4, 5] = Mon-Fri
    autoSchedule: boolean;    // Auto-create events
  };
  
  // Goals
  targetHoursPerWeek?: number;
  startDate: string;
  endDate?: string;
  
  // Progress tracking
  completedHours: number;
  
  createdAt: string;
  updatedAt: string;
}
```

**lib/helpers/event.ts**
```typescript
// Utility functions
export function generateRecurrenceRule(pattern: RecurrencePattern, options: any): string;
export function expandRecurrence(event: Event, startDate: Date, endDate: Date): Event[];
export function calculateNextOccurrence(event: Event): Date | null;
export function isEventConflict(event1: Event, event2: Event): boolean;
export function formatEventTime(event: Event): string;
export function getEventColor(type: EventType): string;
```

### 1.2 Zustand Stores

**stores/eventStore.ts**
```typescript
interface EventStore {
  events: Event[];
  
  // CRUD
  createEvent: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  getEvent: (id: string) => Event | undefined;
  
  // Queries
  getEventsInRange: (startDate: string, endDate: string) => Event[];
  getEventsByType: (type: EventType) => Event[];
  getUpcomingEvents: (limit: number) => Event[];
  searchEvents: (query: string) => Event[];
  
  // Recurrence handling
  expandRecurringEvents: (startDate: string, endDate: string) => Event[];
  
  // Initialization
  initialize: () => void;
}
```

**stores/learningPlanStore.ts**
```typescript
interface LearningPlanStore {
  plans: LearningPlan[];
  
  // CRUD
  createPlan: (plan: Omit<LearningPlan, 'id' | 'completedHours' | 'createdAt' | 'updatedAt'>) => void;
  updatePlan: (id: string, updates: Partial<LearningPlan>) => void;
  deletePlan: (id: string) => void;
  getPlan: (id: string) => LearningPlan | undefined;
  
  // Auto-scheduling
  generateSchedule: (planId: string, startDate: string, endDate: string) => Event[];
  syncWithCalendar: (planId: string) => void;
  
  // Progress
  updateProgress: (planId: string, hoursCompleted: number) => void;
}
```

### 1.3 Validation Schemas

**lib/schemas/event.ts**
```typescript
import { z } from 'zod';

export const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['activity', 'learning', 'meeting', 'reminder', 'custom']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  allDay: z.boolean(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']),
  recurrenceRule: z.string().optional(),
  // ... rest of validation
});

export const learningPlanSchema = z.object({
  name: z.string().min(1).max(100),
  skillIds: z.array(z.string()).min(1),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'custom']),
    durationMinutes: z.number().min(15).max(480),
    // ... rest
  }),
});
```

---

## Phase 2: Calendar UI Components (Week 3-4)

### 2.1 Core Calendar Components

**components/calendar/CalendarMonth.tsx**
- Month view with grid layout
- Event display with color coding
- Click to view/create events
- Drag-and-drop support (future)
- Use `react-big-calendar` library

**components/calendar/CalendarWeek.tsx**
- Week view with time slots
- Hour-by-hour breakdown
- Event blocks with duration

**components/calendar/CalendarDay.tsx**
- Single day detailed view
- Timeline with all events
- Quick event creation

**components/calendar/CalendarControls.tsx**
- View switcher (Month/Week/Day)
- Date navigation
- Today button
- Filter controls (by type, skill, etc.)

### 2.2 Event Components

**components/calendar/EventForm.tsx**
- Create/Edit event form
- Type selector with icons
- Date/time pickers
- Recurrence configuration
- Notification settings
- Skill/Activity linking
- react-hook-form + Zod validation

**components/calendar/EventCard.tsx**
- Compact event display
- Type badge and color
- Time display
- Quick actions (edit, delete, view details)

**components/calendar/EventList.tsx**
- List view of events
- Filtering and sorting
- Grouping by date/type
- Pagination

**components/calendar/EventDetailsModal.tsx**
- Full event details
- Edit/Delete actions
- Link to related skill/activity
- Show recurrence info

### 2.3 Learning Plan Components

**components/learning-plans/LearningPlanForm.tsx**
- Create/Edit learning plan
- Skill selection (multi-select)
- Schedule configuration
- Auto-schedule toggle
- Goal setting

**components/learning-plans/LearningPlanCard.tsx**
- Plan overview
- Progress bar
- Next scheduled session
- Quick edit/delete

**components/learning-plans/LearningPlanList.tsx**
- All plans list
- Active/Completed filtering
- Progress tracking

### 2.4 Dependencies to Install

```bash
bun add react-big-calendar date-fns rrule react-colorful
bun add -d @types/react-big-calendar
```

---

## Phase 3: Calendar Page & Integration (Week 5)

### 3.1 Calendar Page

**app/calendar/page.tsx**
```typescript
'use client';

export default function CalendarPage() {
  // Main calendar view with controls
  // Event creation/editing
  // Learning plan sidebar
  // Upcoming events widget
}
```

### 3.2 Integration Points

**Update Sidebar**
- Add Calendar link with Calendar icon (lucide-react)

**Update Activity System**
- When activity is completed, create calendar event
- Link activities to calendar events
- Show "Add to Calendar" button in ActivityForm

**Update Skill Pages**
- Show upcoming learning plan events
- Quick schedule button

**Update Home Page**
- Today's events widget
- Upcoming events card

---

## Phase 4: Notification System (Week 6)

### 4.1 Browser Notifications

**lib/notifications/browser.ts**
```typescript
export function requestNotificationPermission(): Promise<boolean>;
export function sendBrowserNotification(event: Event): void;
export function checkUpcomingEvents(): void; // Run every minute
```

**hooks/useNotifications.ts**
- Permission status
- Schedule notifications
- Notification preferences

### 4.2 Notification Store

**stores/notificationStore.ts**
```typescript
interface NotificationStore {
  permissions: {
    browser: boolean;
    telegram: boolean;
  };
  
  preferences: {
    enabled: boolean;
    defaultChannels: NotificationChannel[];
    defaultReminderMinutes: number[];
  };
  
  // Actions
  requestPermissions: () => Promise<void>;
  updatePreferences: (prefs: Partial<Preferences>) => void;
  scheduleNotification: (event: Event) => void;
  cancelNotification: (eventId: string) => void;
}
```

### 4.3 Settings Page

**app/settings/page.tsx**
- Notification preferences
- Channel toggles
- Default reminder times
- Test notification button

---

## Phase 5: Smart Features (Week 7)

### 5.1 Auto-Scheduling Algorithm

**lib/scheduling/autoSchedule.ts**
```typescript
interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export function findAvailableSlots(
  existingEvents: Event[],
  preferences: LearningPlan['schedule'],
  startDate: Date,
  endDate: Date
): TimeSlot[];

export function scheduleOptimally(
  plan: LearningPlan,
  existingEvents: Event[],
  period: { start: Date; end: Date }
): Event[];
```

### 5.2 Conflict Detection

**lib/scheduling/conflicts.ts**
```typescript
export function detectConflicts(events: Event[]): ConflictGroup[];
export function suggestResolution(conflict: ConflictGroup): ResolutionOption[];
```

### 5.3 Event Templates

**lib/templates/eventTemplates.ts**
```typescript
export const templates = {
  dailyReview: { title: "Daily Review", duration: 15, ... },
  deepWork: { title: "Deep Work Session", duration: 90, ... },
  quickStudy: { title: "Quick Study", duration: 30, ... },
};
```

**components/calendar/TemplateSelector.tsx**
- Quick template picker
- Customizable templates
- Save custom templates

---

## Phase 6: Backend API Integration (Week 8-9)

### 6.1 Go GraphQL Schema

**backend/graph/schema.graphqls**
```graphql
type Event {
  id: ID!
  title: String!
  description: String
  type: EventType!
  startTime: Time!
  endTime: Time!
  allDay: Boolean!
  recurrence: RecurrencePattern!
  recurrenceRule: String
  notifications: NotificationSettings!
  skill: Skill
  activity: Activity
  learningPlan: LearningPlan
  color: String
  gmailEventId: String
  createdAt: Time!
  updatedAt: Time!
}

enum EventType {
  ACTIVITY
  LEARNING
  MEETING
  REMINDER
  CUSTOM
}

type LearningPlan {
  id: ID!
  name: String!
  skills: [Skill!]!
  schedule: ScheduleSettings!
  progress: PlanProgress!
  events: [Event!]!
}

input CreateEventInput {
  title: String!
  type: EventType!
  startTime: Time!
  endTime: Time!
  # ... rest of fields
}

type Query {
  events(startDate: Time, endDate: Time, type: EventType): [Event!]!
  event(id: ID!): Event
  learningPlans: [LearningPlan!]!
  learningPlan(id: ID!): LearningPlan
  upcomingEvents(limit: Int): [Event!]!
}

type Mutation {
  createEvent(input: CreateEventInput!): Event!
  updateEvent(id: ID!, input: UpdateEventInput!): Event!
  deleteEvent(id: ID!): Boolean!
  
  createLearningPlan(input: CreateLearningPlanInput!): LearningPlan!
  updateLearningPlan(id: ID!, input: UpdateLearningPlanInput!): LearningPlan!
  deleteLearningPlan(id: ID!): Boolean!
  generateSchedule(planId: ID!, startDate: Time!, endDate: Time!): [Event!]!
}

type Subscription {
  eventReminder(userId: ID!): Event!
}
```

### 6.2 PostgreSQL Schema

**migrations/003_calendar_system.sql**
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    
    -- Recurrence
    recurrence VARCHAR(20) DEFAULT 'none',
    recurrence_rule TEXT,
    recurrence_end TIMESTAMP WITH TIME ZONE,
    
    -- Relations
    skill_id UUID REFERENCES skills(id),
    activity_id UUID REFERENCES activities(id),
    learning_plan_id UUID REFERENCES learning_plans(id),
    
    -- Notifications
    notifications JSONB DEFAULT '{"enabled": true, "channels": ["browser"], "reminderMinutes": [15]}',
    
    -- Metadata
    color VARCHAR(7),
    location TEXT,
    attendees TEXT[],
    tags TEXT[],
    
    -- External
    gmail_event_id VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_time_range ON events(user_id, start_time, end_time);
CREATE INDEX idx_events_type ON events(user_id, type);
CREATE INDEX idx_events_skill ON events(skill_id);

CREATE TABLE learning_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    skill_ids UUID[] NOT NULL,
    
    -- Schedule
    schedule JSONB NOT NULL,
    
    -- Goals
    target_hours_per_week INTEGER,
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Progress
    completed_hours DECIMAL(10, 2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notifications_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    user_id UUID NOT NULL REFERENCES users(id),
    channel VARCHAR(20) NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_pending ON notifications_queue(scheduled_time, sent) WHERE sent = FALSE;
```

### 6.3 Frontend API Client

**lib/api/calendar.ts**
```typescript
import { gql } from 'graphql-request';

export const GET_EVENTS = gql`
  query GetEvents($startDate: Time!, $endDate: Time!) {
    events(startDate: $startDate, endDate: $endDate) {
      id
      title
      type
      startTime
      endTime
      # ... rest
    }
  }
`;

export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      # ... rest
    }
  }
`;

// API functions with error handling
export async function fetchEvents(startDate: string, endDate: string): Promise<Event[]>;
export async function createEvent(input: CreateEventInput): Promise<Event>;
```

### 6.4 Data Migration

**lib/migrations/calendar.ts**
- Migrate localStorage events to backend
- Sync on first backend connection
- Conflict resolution strategy

---

## Phase 7: External Integrations (Week 10)

### 7.1 Telegram Bot

**Backend: bot/telegram.go**
```go
// Telegram bot commands
// /schedule <activity> at <time>
// /events today
// /events tomorrow
// /cancel <event>
// /plans
// /remind <event> <minutes_before>

// Use simple NLP or pattern matching
// Parse time expressions (tomorrow, in 2 hours, etc.)
```

**Backend: bot/parser.go**
```go
// Intent detection
// Entity extraction (time, date, activity name)
// Command routing
```

**Notification Worker**
- Check notifications_queue every minute
- Send Telegram messages for due notifications
- Update sent status

**Frontend: app/settings/telegram/page.tsx**
- Telegram bot setup instructions
- Connect Telegram account
- Test notification button

### 7.2 Gmail Calendar Integration

**Backend: integrations/gmail.go**
```go
// OAuth 2.0 flow
// Google Calendar API client
// Two-way sync:
//   - Import Gmail events to LifeTrack
//   - Export LifeTrack events to Gmail
// Webhook for real-time updates
```

**Frontend: app/settings/integrations/page.tsx**
- Connect Gmail account (OAuth flow)
- Sync preferences
- Conflict resolution settings
- Manual sync button

**Sync Strategy**
- Incremental sync (only changes)
- Conflict resolution (last-write-wins or user choice)
- Sync frequency configuration

---

## Technical Decisions

### Date/Time Handling
- Use `date-fns` for all date operations
- Store all times in UTC (ISO 8601)
- Display in user's local timezone
- Support timezone selection for events

### Recurrence
- Use `rrule.js` for recurrence rules (RFC 5545 standard)
- Support DAILY, WEEKLY, MONTHLY patterns
- Custom RRULE for advanced patterns
- Pre-calculate occurrences for performance (expand on query)

### Performance
- Lazy load calendar events (only visible range)
- Virtual scrolling for large event lists
- Debounce auto-schedule calculations
- Cache recurrence expansions

### Accessibility
- Keyboard navigation in calendar
- Screen reader announcements for events
- High contrast mode support
- Focus management in modals

### Testing
- Unit tests for scheduling algorithm
- Integration tests for API endpoints
- E2E tests for critical flows (create event, auto-schedule)

---

## Dependencies

### Frontend
```json
{
  "react-big-calendar": "^1.8.5",
  "date-fns": "^3.0.0",
  "rrule": "^2.8.1",
  "react-colorful": "^5.6.1"
}
```

### Backend
```go
// go.mod
require (
    github.com/teambition/rrule-go v1.8.2
    google.golang.org/api v0.150.0  // Gmail Calendar
    github.com/go-telegram-bot-api/telegram-bot-api/v5 v5.5.1
)
```

---

## Future Enhancements

1. **AI-Powered Scheduling**
   - Learn user preferences
   - Suggest optimal study times
   - Balance workload automatically

2. **Team Features**
   - Shared calendars
   - Study group scheduling
   - Mentor/mentee visibility

3. **Advanced Analytics**
   - Time distribution charts
   - Productivity patterns
   - Goal achievement tracking

4. **Mobile App**
   - React Native app
   - Offline support
   - Push notifications

5. **Integration Marketplace**
   - Notion sync
   - Todoist integration
   - GitHub activity import
   - Calendar plugins

---

## Migration from Current System

### Backward Compatibility
- Keep existing Activity system
- Automatically create calendar event for each activity
- Bidirectional sync (Activity ↔ Event)

### Data Migration
```typescript
// Migrate existing activities to events
function migrateActivitiesToEvents(activities: Activity[]): Event[] {
  return activities.map(activity => ({
    id: `event_${activity.id}`,
    title: activity.name,
    type: 'activity',
    startTime: activity.date + 'T' + calculateStartTime(activity),
    endTime: activity.date + 'T' + calculateEndTime(activity),
    activityId: activity.id,
    skillId: activity.skillId,
    // ... rest
  }));
}
```

---

## Ready to Start Phase 1! 🚀

The calendar system will integrate seamlessly with your existing Activity tracking while providing a flexible foundation for all types of events and scheduling needs.

Next steps:
1. Install dependencies
2. Create Event and LearningPlan data models
3. Build Zustand stores
4. Create Zod schemas
5. Start building Calendar UI components

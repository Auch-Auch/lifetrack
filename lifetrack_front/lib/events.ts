/**
 * Event and Learning Plan Data Models
 * 
 * This module defines the core types and interfaces for the calendar system.
 * Events are generic and can represent activities, meetings, reminders, or any scheduled item.
 * Learning Plans enable automatic scheduling of study sessions.
 */

// ============================================================================
// Event Types
// ============================================================================

export type EventType = 'activity' | 'learning' | 'meeting' | 'reminder' | 'custom';

export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export type NotificationChannel = 'browser' | 'telegram' | 'both';

export interface NotificationSettings {
  enabled: boolean;
  channels: NotificationChannel[];
  reminderMinutes: number[]; // e.g., [15, 60] = 15min and 1hr before
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  
  // Timing
  startTime: string; // ISO 8601 format with timezone
  endTime: string;   // ISO 8601 format with timezone
  allDay: boolean;
  
  // Recurrence
  recurrence: RecurrencePattern;
  recurrenceRule?: string; // RRULE format (RFC 5545)
  recurrenceEnd?: string;  // ISO 8601 - when recurrence ends
  
  // Relations - link events to existing entities
  skillId?: string;        // Link to skill
  activityId?: string;     // Link to activity
  learningPlanId?: string; // Link to learning plan
  
  // Notifications
  notifications: NotificationSettings;
  
  // Metadata
  color?: string;          // Hex color for calendar display
  location?: string;       // Physical or virtual location
  attendees?: string[];    // Email addresses or user IDs
  tags?: string[];         // Custom tags for filtering
  
  // External Integration
  gmailEventId?: string;   // For Gmail Calendar sync
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Learning Plan Types
// ============================================================================

export interface ScheduleSettings {
  frequency: 'daily' | 'weekly' | 'custom';
  durationMinutes: number;
  preferredTimes: string[];  // ["09:00", "14:00"] - 24hr format
  preferredDays: number[];   // [1, 2, 3, 4, 5] = Monday-Friday (0=Sunday)
  autoSchedule: boolean;     // Automatically create events
}

export interface LearningPlan {
  id: string;
  name: string;
  description?: string;
  skillIds: string[];        // Skills included in this plan
  
  // Scheduling preferences
  schedule: ScheduleSettings;
  
  // Goals
  targetHoursPerWeek?: number;
  startDate: string;          // ISO 8601 date (YYYY-MM-DD)
  endDate?: string;           // Optional end date
  
  // Progress tracking
  completedHours: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface ConflictGroup {
  events: Event[];
  timeRange: { start: string; end: string };
}

export interface ResolutionOption {
  type: 'move' | 'shorten' | 'cancel';
  eventId: string;
  newStartTime?: string;
  newEndTime?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for events/plans
 */
export function generateId(prefix: 'event' | 'plan'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format event time for display
 */
export function formatEventTime(event: Event): string {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  
  if (event.allDay) {
    return 'All day';
  }
  
  const timeOptions: Intl.DateTimeFormatOptions = { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  };
  
  const startTime = start.toLocaleTimeString('en-US', timeOptions);
  const endTime = end.toLocaleTimeString('en-US', timeOptions);
  
  return `${startTime} - ${endTime}`;
}

/**
 * Format event duration in human-readable format
 */
export function formatEventDuration(event: Event): string {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const durationMs = end.getTime() - start.getTime();
  const durationMin = Math.round(durationMs / 60000);
  
  if (durationMin < 60) {
    return `${durationMin}m`;
  }
  
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}m`;
}

/**
 * Calculate duration in minutes
 */
export function calculateEventDuration(event: Event): number {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

/**
 * Get color based on event type
 */
export function getEventTypeColor(type: EventType): string {
  const colors: Record<EventType, string> = {
    activity: '#22c55e',   // green
    learning: '#3b82f6',   // blue
    meeting: '#a855f7',    // purple
    reminder: '#f59e0b',   // amber
    custom: '#6b7280',     // gray
  };
  return colors[type];
}

/**
 * Check if two events overlap in time
 */
export function eventsOverlap(event1: Event, event2: Event): boolean {
  const start1 = new Date(event1.startTime);
  const end1 = new Date(event1.endTime);
  const start2 = new Date(event2.startTime);
  const end2 = new Date(event2.endTime);
  
  return start1 < end2 && start2 < end1;
}

/**
 * Check if event occurs on a specific date
 */
export function isEventOnDate(event: Event, date: Date): boolean {
  const eventDate = new Date(event.startTime);
  return (
    eventDate.getFullYear() === date.getFullYear() &&
    eventDate.getMonth() === date.getMonth() &&
    eventDate.getDate() === date.getDate()
  );
}

/**
 * Get events that fall within a date range
 */
export function filterEventsByDateRange(
  events: Event[],
  startDate: Date,
  endDate: Date
): Event[] {
  return events.filter(event => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    
    // Event starts or ends within range, or spans the entire range
    return (
      (eventStart >= startDate && eventStart <= endDate) ||
      (eventEnd >= startDate && eventEnd <= endDate) ||
      (eventStart <= startDate && eventEnd >= endDate)
    );
  });
}

/**
 * Sort events by start time
 */
export function sortEventsByTime(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });
}

/**
 * Group events by date (YYYY-MM-DD)
 */
export function groupEventsByDate(events: Event[]): Record<string, Event[]> {
  const grouped: Record<string, Event[]> = {};
  
  events.forEach(event => {
    const date = event.startTime.split('T')[0];
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(event);
  });
  
  return grouped;
}

/**
 * Calculate total hours from learning plan progress
 */
export function calculatePlanProgress(plan: LearningPlan): {
  completedHours: number;
  targetHours: number;
  percentComplete: number;
} {
  const now = new Date();
  const start = new Date(plan.startDate);
  
  // Calculate weeks elapsed
  const weeksElapsed = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const targetHours = plan.targetHoursPerWeek 
    ? weeksElapsed * plan.targetHoursPerWeek 
    : 0;
  
  const percentComplete = targetHours > 0 
    ? Math.min(100, Math.round((plan.completedHours / targetHours) * 100))
    : 0;
  
  return {
    completedHours: plan.completedHours,
    targetHours,
    percentComplete,
  };
}

/**
 * Create a default notification settings object
 */
export function createDefaultNotifications(): NotificationSettings {
  return {
    enabled: true,
    channels: ['browser'],
    reminderMinutes: [15], // 15 minutes before
  };
}

/**
 * Create a basic event from minimal data
 */
export function createBasicEvent(
  title: string,
  startTime: Date,
  durationMinutes: number,
  type: EventType = 'custom'
): Omit<Event, 'id' | 'createdAt' | 'updatedAt'> {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
  
  return {
    title,
    type,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    allDay: false,
    recurrence: 'none',
    notifications: createDefaultNotifications(),
  };
}

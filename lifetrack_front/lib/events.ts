'use client'

import { getClient } from './helpers/api-client'

/**
 * Event and Learning Plan Data Models with GraphQL Integration
 */

// ============================================================================
// Event Types
// ============================================================================

export type EventType = 'ACTIVITY' | 'LEARNING' | 'MEETING' | 'REMINDER' | 'CUSTOM';

export type RecurrencePattern = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export type NotificationChannel = 'browser' | 'telegram' | 'both';

export interface NotificationSettings {
  enabled: boolean;
  channels: string[];
  reminderMinutes: number[];
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  
  // Timing
  startTime: string;
  endTime: string;
  allDay: boolean;
  
  // Recurrence
  recurrence: RecurrencePattern;
  recurrenceRule?: string;
  recurrenceEnd?: string;
  
  // Relations
  skillId?: string;
  activityId?: string;
  learningPlanId?: string;
  
  // Notifications
  notifications?: NotificationSettings;
  
  // Metadata
  color?: string;
  location?: string;
  attendees?: string[];
  tags?: string[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export type CreateEventInput = {
  title: string;
  description?: string;
  type: EventType;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  recurrence?: RecurrencePattern;
  recurrenceRule?: string;
  recurrenceEnd?: string;
  skillId?: string;
  activityId?: string;
  learningPlanId?: string;
  notifications?: NotificationSettings;
  color?: string;
  location?: string;
  attendees?: string[];
  tags?: string[];
}

export type UpdateEventInput = Partial<CreateEventInput>

// ============================================================================
// Learning Plan Types
// ============================================================================

export interface ScheduleSettings {
  frequency: string;
  durationMinutes: number;
  preferredTimes: string[];
  preferredDays: number[];
  autoSchedule: boolean;
}

export interface LearningPlan {
  id: string;
  name: string;
  description?: string;
  skillIds: string[];
  schedule: ScheduleSettings;
  targetHoursPerWeek?: number;
  startDate: string;
  endDate?: string;
  completedHours: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateLearningPlanInput = {
  name: string;
  description?: string;
  skillIds: string[];
  schedule: ScheduleSettings;
  targetHoursPerWeek?: number;
  startDate: string;
  endDate?: string;
}

export type UpdateLearningPlanInput = {
  name?: string;
  description?: string;
  skillIds?: string[];
  schedule?: ScheduleSettings;
  targetHoursPerWeek?: number;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// GraphQL Queries
// ============================================================================

const GET_EVENTS_QUERY = `
  query GetEvents($startDate: Date!, $endDate: Date!, $type: EventType) {
    events(startDate: $startDate, endDate: $endDate, type: $type) {
      id
      title
      description
      type
      startTime
      endTime
      allDay
      recurrence
      recurrenceRule
      recurrenceEnd
      skillId
      activityId
      learningPlanId
      notifications {
        enabled
        channels
        reminderMinutes
      }
      color
      location
      attendees
      tags
      createdAt
      updatedAt
    }
  }
`

const GET_EVENT_QUERY = `
  query GetEvent($id: UUID!) {
    event(id: $id) {
      id
      title
      description
      type
      startTime
      endTime
      allDay
      recurrence
      recurrenceRule
      recurrenceEnd
      skillId
      activityId
      learningPlanId
      notifications {
        enabled
        channels
        reminderMinutes
      }
      color
      location
      attendees
      tags
      createdAt
      updatedAt
    }
  }
`

const GET_UPCOMING_EVENTS_QUERY = `
  query GetUpcomingEvents($limit: Int) {
    upcomingEvents(limit: $limit) {
      id
      title
      description
      type
      startTime
      endTime
      allDay
      color
      location
      createdAt
      updatedAt
    }
  }
`

const CREATE_EVENT_MUTATION = `
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      title
      description
      type
      startTime
      endTime
      allDay
      recurrence
      recurrenceRule
      recurrenceEnd
      skillId
      activityId
      learningPlanId
      color
      location
      attendees
      tags
      createdAt
      updatedAt
    }
  }
`

const UPDATE_EVENT_MUTATION = `
  mutation UpdateEvent($id: UUID!, $input: UpdateEventInput!) {
    updateEvent(id: $id, input: $input) {
      id
      title
      description
      type
      startTime
      endTime
      allDay
      recurrence
      recurrenceRule
      recurrenceEnd
      skillId
      activityId
      learningPlanId
      color
      location
      attendees
      tags
      createdAt
      updatedAt
    }
  }
`

const DELETE_EVENT_MUTATION = `
  mutation DeleteEvent($id: UUID!) {
    deleteEvent(id: $id)
  }
`

const GET_LEARNING_PLANS_QUERY = `
  query GetLearningPlans {
    learningPlans {
      id
      name
      description
      skillIds
      schedule {
        frequency
        durationMinutes
        preferredTimes
        preferredDays
        autoSchedule
      }
      targetHoursPerWeek
      startDate
      endDate
      completedHours
      createdAt
      updatedAt
    }
  }
`

const GET_LEARNING_PLAN_QUERY = `
  query GetLearningPlan($id: UUID!) {
    learningPlan(id: $id) {
      id
      name
      description
      skillIds
      schedule {
        frequency
        durationMinutes
        preferredTimes
        preferredDays
        autoSchedule
      }
      targetHoursPerWeek
      startDate
      endDate
      completedHours
      createdAt
      updatedAt
    }
  }
`

const CREATE_LEARNING_PLAN_MUTATION = `
  mutation CreateLearningPlan($input: CreateLearningPlanInput!) {
    createLearningPlan(input: $input) {
      id
      name
      description
      skillIds
      schedule {
        frequency
        durationMinutes
        preferredTimes
        preferredDays
        autoSchedule
      }
      targetHoursPerWeek
      startDate
      endDate
      completedHours
      createdAt
      updatedAt
    }
  }
`

const UPDATE_LEARNING_PLAN_MUTATION = `
  mutation UpdateLearningPlan($id: UUID!, $input: UpdateLearningPlanInput!) {
    updateLearningPlan(id: $id, input: $input) {
      id
      name
      description
      skillIds
      schedule {
        frequency
        durationMinutes
        preferredTimes
        preferredDays
        autoSchedule
      }
      targetHoursPerWeek
      startDate
      endDate
      completedHours
      createdAt
      updatedAt
    }
  }
`

const DELETE_LEARNING_PLAN_MUTATION = `
  mutation DeleteLearningPlan($id: UUID!) {
    deleteLearningPlan(id: $id)
  }
`

const GENERATE_SCHEDULE_MUTATION = `
  mutation GenerateSchedule($planId: UUID!) {
    generateSchedule(planId: $planId) {
      id
      title
      description
      type
      startTime
      endTime
      learningPlanId
      createdAt
      updatedAt
    }
  }
`

// ============================================================================
// API Functions - Events
// ============================================================================

export async function getEvents(
  startDate: string,
  endDate: string,
  type?: EventType
): Promise<Event[]> {
  const client = getClient()
  const result = await client.query(GET_EVENTS_QUERY, { startDate, endDate, type }).toPromise()
  
  if (result.error) {
    console.error('Error fetching events:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.events || []
}

export async function getEventById(id: string): Promise<Event | null> {
  const client = getClient()
  const result = await client.query(GET_EVENT_QUERY, { id }).toPromise()
  
  if (result.error) {
    console.error('Error fetching event:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.event || null
}

export async function getUpcomingEvents(limit?: number): Promise<Event[]> {
  const client = getClient()
  const result = await client.query(GET_UPCOMING_EVENTS_QUERY, { limit }).toPromise()
  
  if (result.error) {
    console.error('Error fetching upcoming events:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.upcomingEvents || []
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const client = getClient()
  const result = await client.mutation(CREATE_EVENT_MUTATION, { input }).toPromise()
  
  if (result.error) {
    console.error('Error creating event:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.createEvent
}

export async function updateEvent(id: string, input: UpdateEventInput): Promise<Event> {
  const client = getClient()
  const result = await client.mutation(UPDATE_EVENT_MUTATION, { id, input }).toPromise()
  
  if (result.error) {
    console.error('Error updating event:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.updateEvent
}

export async function deleteEvent(id: string): Promise<boolean> {
  const client = getClient()
  const result = await client.mutation(DELETE_EVENT_MUTATION, { id }).toPromise()
  
  if (result.error) {
    console.error('Error deleting event:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.deleteEvent
}

// ============================================================================
// API Functions - Learning Plans
// ============================================================================

export async function getLearningPlans(): Promise<LearningPlan[]> {
  const client = getClient()
  const result = await client.query(GET_LEARNING_PLANS_QUERY, {}).toPromise()
  
  if (result.error) {
    console.error('Error fetching learning plans:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.learningPlans || []
}

export async function getLearningPlanById(id: string): Promise<LearningPlan | null> {
  const client = getClient()
  const result = await client.query(GET_LEARNING_PLAN_QUERY, { id }).toPromise()
  
  if (result.error) {
    console.error('Error fetching learning plan:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.learningPlan || null
}

export async function createLearningPlan(input: CreateLearningPlanInput): Promise<LearningPlan> {
  const client = getClient()
  const result = await client.mutation(CREATE_LEARNING_PLAN_MUTATION, { input }).toPromise()
  
  if (result.error) {
    console.error('Error creating learning plan:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.createLearningPlan
}

export async function updateLearningPlan(id: string, input: UpdateLearningPlanInput): Promise<LearningPlan> {
  const client = getClient()
  const result = await client.mutation(UPDATE_LEARNING_PLAN_MUTATION, { id, input }).toPromise()
  
  if (result.error) {
    console.error('Error updating learning plan:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.updateLearningPlan
}

export async function deleteLearningPlan(id: string): Promise<boolean> {
  const client = getClient()
  const result = await client.mutation(DELETE_LEARNING_PLAN_MUTATION, { id }).toPromise()
  
  if (result.error) {
    console.error('Error deleting learning plan:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.deleteLearningPlan
}

export async function generateSchedule(planId: string): Promise<Event[]> {
  const client = getClient()
  const result = await client.mutation(GENERATE_SCHEDULE_MUTATION, { planId }).toPromise()
  
  if (result.error) {
    console.error('Error generating schedule:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.generateSchedule
}

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
    ACTIVITY: '#22c55e',   // green
    LEARNING: '#3b82f6',   // blue
    MEETING: '#a855f7',    // purple
    REMINDER: '#f59e0b',   // amber
    CUSTOM: '#6b7280',     // gray
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
  type: EventType = 'CUSTOM'
): Omit<Event, 'id' | 'createdAt' | 'updatedAt'> {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
  
  return {
    title,
    type,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    allDay: false,
    recurrence: 'NONE',
    notifications: createDefaultNotifications(),
  };
}

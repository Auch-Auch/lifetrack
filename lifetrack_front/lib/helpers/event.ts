/**
 * Event Helper Functions
 * 
 * Advanced utilities for event management including:
 * - Recurrence rule generation and expansion
 * - Conflict detection and resolution
 * - Time slot availability
 */

import { RRule, rrulestr } from 'rrule';
import { isWithinInterval } from 'date-fns';
import type { Event, RecurrencePattern, TimeSlot, ConflictGroup, ResolutionOption } from '../events';

// ============================================================================
// Recurrence Rule Generation
// ============================================================================

/**
 * Generate an RRULE string from pattern and options
 */
export function generateRecurrenceRule(
  pattern: RecurrencePattern,
  options: {
    startDate: Date;
    count?: number;      // Number of occurrences
    until?: Date;        // End date
    interval?: number;   // Frequency interval (e.g., every 2 weeks)
    byWeekday?: number[]; // Days of week (0=Monday, 6=Sunday in RRule)
    byMonthDay?: number[]; // Days of month
  }
): string {
  const { startDate, count, until, interval = 1, byWeekday, byMonthDay } = options;
  
  if (pattern === 'NONE') {
    return '';
  }
  
  let freq: number;
  switch (pattern) {
    case 'DAILY':
      freq = RRule.DAILY;
      break;
    case 'WEEKLY':
      freq = RRule.WEEKLY;
      break;
    case 'MONTHLY':
      freq = RRule.MONTHLY;
      break;
    case 'CUSTOM':
      freq = RRule.WEEKLY; // Default for custom
      break;
    default:
      return '';
  }
  
  const ruleOptions: Record<string, unknown> = {
    freq,
    dtstart: startDate,
    interval,
  };
  
  if (count) {
    ruleOptions.count = count;
  } else if (until) {
    ruleOptions.until = until;
  }
  
  if (byWeekday && byWeekday.length > 0) {
    ruleOptions.byweekday = byWeekday;
  }
  
  if (byMonthDay && byMonthDay.length > 0) {
    ruleOptions.bymonthday = byMonthDay;
  }
  
  const rule = new RRule(ruleOptions);
  return rule.toString();
}

/**
 * Parse an RRULE string and return human-readable description
 */
export function describeRecurrenceRule(rruleStr: string): string {
  if (!rruleStr) return 'Does not repeat';
  
  try {
    const rule = rrulestr(rruleStr);
    return rule.toText();
  } catch (error) {
    console.error('Failed to parse RRULE:', error);
    return 'Custom recurrence';
  }
}

/**
 * Expand recurring event into multiple occurrences
 */
export function expandRecurrence(
  event: Event,
  startDate: Date,
  endDate: Date
): Event[] {
  // Non-recurring events return single instance
  if (event.recurrence === 'NONE' || !event.recurrenceRule) {
    const eventStart = new Date(event.startTime);
    if (isWithinInterval(eventStart, { start: startDate, end: endDate })) {
      return [event];
    }
    return [];
  }
  
  try {
    const rule = rrulestr(event.recurrenceRule);
    const occurrences = rule.between(startDate, endDate, true);
    
    // Calculate duration once
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    const durationMs = eventEnd.getTime() - eventStart.getTime();
    
    // Create event instances for each occurrence
    return occurrences.map((occurrence, index) => {
      const instanceStart = occurrence;
      const instanceEnd = new Date(occurrence.getTime() + durationMs);
      
      return {
        ...event,
        id: `${event.id}_${index}`,
        startTime: instanceStart.toISOString(),
        endTime: instanceEnd.toISOString(),
      };
    });
  } catch (error) {
    console.error('Failed to expand recurrence:', error);
    return [event]; // Fallback to single event
  }
}

/**
 * Calculate the next occurrence of a recurring event
 */
export function calculateNextOccurrence(event: Event): Date | null {
  if (event.recurrence === 'NONE' || !event.recurrenceRule) {
    return new Date(event.startTime);
  }
  
  try {
    const rule = rrulestr(event.recurrenceRule);
    const now = new Date();
    const nextOccurrence = rule.after(now, true); // inclusive
    return nextOccurrence;
  } catch (error) {
    console.error('Failed to calculate next occurrence:', error);
    return null;
  }
}

// ============================================================================
// Conflict Detection
// ============================================================================

/**
 * Check if two events conflict (overlap in time)
 */
export function isEventConflict(event1: Event, event2: Event): boolean {
  const start1 = new Date(event1.startTime);
  const end1 = new Date(event1.endTime);
  const start2 = new Date(event2.startTime);
  const end2 = new Date(event2.endTime);
  
  return start1 < end2 && start2 < end1;
}

/**
 * Detect all conflicts in a list of events
 */
export function detectConflicts(events: Event[]): ConflictGroup[] {
  const conflicts: ConflictGroup[] = [];
  const checked = new Set<string>();
  
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i];
      const event2 = events[j];
      const pairKey = [event1.id, event2.id].sort().join('-');
      
      if (checked.has(pairKey)) continue;
      checked.add(pairKey);
      
      if (isEventConflict(event1, event2)) {
        // Check if we can add to existing conflict group
        let addedToGroup = false;
        for (const group of conflicts) {
          if (group.events.some(e => e.id === event1.id || e.id === event2.id)) {
            if (!group.events.some(e => e.id === event1.id)) {
              group.events.push(event1);
            }
            if (!group.events.some(e => e.id === event2.id)) {
              group.events.push(event2);
            }
            addedToGroup = true;
            break;
          }
        }
        
        // Create new conflict group
        if (!addedToGroup) {
          const earliestStart = new Date(Math.min(
            new Date(event1.startTime).getTime(),
            new Date(event2.startTime).getTime()
          ));
          const latestEnd = new Date(Math.max(
            new Date(event1.endTime).getTime(),
            new Date(event2.endTime).getTime()
          ));
          
          conflicts.push({
            events: [event1, event2],
            timeRange: {
              start: earliestStart.toISOString(),
              end: latestEnd.toISOString(),
            },
          });
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * Suggest resolutions for event conflicts
 */
export function suggestResolution(conflict: ConflictGroup): ResolutionOption[] {
  const options: ResolutionOption[] = [];
  const { events, timeRange } = conflict;
  
  // Sort events by priority (can be extended with actual priority field)
  const sortedEvents = [...events].sort((a, b) => {
    // Prioritize non-recurring events
    if (a.recurrence === 'NONE' && b.recurrence !== 'NONE') return -1;
    if (a.recurrence !== 'NONE' && b.recurrence === 'NONE') return 1;
    return 0;
  });
  
  // Option 1: Cancel lower priority events
  for (let i = 1; i < sortedEvents.length; i++) {
    options.push({
      type: 'cancel',
      eventId: sortedEvents[i].id,
    });
  }
  
  // Option 2: Move events sequentially
  let currentEnd = new Date(timeRange.start);
  for (const event of sortedEvents) {
    const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
    const newStart = new Date(currentEnd);
    const newEnd = new Date(currentEnd.getTime() + duration);
    
    if (newStart.toISOString() !== event.startTime) {
      options.push({
        type: 'move',
        eventId: event.id,
        newStartTime: newStart.toISOString(),
        newEndTime: newEnd.toISOString(),
      });
    }
    
    currentEnd = newEnd;
  }
  
  return options;
}

// ============================================================================
// Time Slot Management
// ============================================================================

/**
 * Find available time slots in a given date range
 */
export function findAvailableSlots(
  existingEvents: Event[],
  date: Date,
  slotDurationMinutes: number,
  workingHours: { start: string; end: string } = { start: '09:00', end: '18:00' }
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  // Parse working hours
  const [startHour, startMin] = workingHours.start.split(':').map(Number);
  const [endHour, endMin] = workingHours.end.split(':').map(Number);
  
  const dayStart = new Date(date);
  dayStart.setHours(startHour, startMin, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, endMin, 0, 0);
  
  // Get events on this day
  const dayEvents = existingEvents.filter(event => {
    const eventStart = new Date(event.startTime);
    return eventStart.toDateString() === date.toDateString();
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  let currentTime = dayStart;
  
  for (const event of dayEvents) {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    
    // Check if there's a gap before this event
    if (currentTime < eventStart) {
      const gapDuration = (eventStart.getTime() - currentTime.getTime()) / 60000;
      if (gapDuration >= slotDurationMinutes) {
        slots.push({
          start: new Date(currentTime),
          end: new Date(Math.min(eventStart.getTime(), currentTime.getTime() + slotDurationMinutes * 60000)),
          available: true,
        });
      }
    }
    
    // Move current time to after this event
    currentTime = new Date(Math.max(currentTime.getTime(), eventEnd.getTime()));
  }
  
  // Check for remaining time at end of day
  if (currentTime < dayEnd) {
    const remainingDuration = (dayEnd.getTime() - currentTime.getTime()) / 60000;
    if (remainingDuration >= slotDurationMinutes) {
      slots.push({
        start: new Date(currentTime),
        end: new Date(Math.min(dayEnd.getTime(), currentTime.getTime() + slotDurationMinutes * 60000)),
        available: true,
      });
    }
  }
  
  return slots;
}

/**
 * Find the best time slot based on preferences
 */
export function findBestSlot(
  availableSlots: TimeSlot[],
  preferredTimes: string[] // ["09:00", "14:00"]
): TimeSlot | null {
  if (availableSlots.length === 0) return null;
  
  // If no preferences, return first available
  if (preferredTimes.length === 0) return availableSlots[0];
  
  // Score each slot based on proximity to preferred times
  const scoredSlots = availableSlots.map(slot => {
    const slotTime = slot.start.getHours() * 60 + slot.start.getMinutes();
    
    const minDistance = preferredTimes.reduce((min, preferredTime) => {
      const [hour, minute] = preferredTime.split(':').map(Number);
      const prefTime = hour * 60 + minute;
      const distance = Math.abs(slotTime - prefTime);
      return Math.min(min, distance);
    }, Infinity);
    
    return { slot, score: minDistance };
  });
  
  // Sort by score (lower is better)
  scoredSlots.sort((a, b) => a.score - b.score);
  
  return scoredSlots[0].slot;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate event time range
 */
export function validateEventTimes(startTime: string, endTime: string): {
  valid: boolean;
  error?: string;
} {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (isNaN(start.getTime())) {
    return { valid: false, error: 'Invalid start time' };
  }
  
  if (isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid end time' };
  }
  
  if (start >= end) {
    return { valid: false, error: 'End time must be after start time' };
  }
  
  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
  if (durationMinutes < 1) {
    return { valid: false, error: 'Event must be at least 1 minute long' };
  }
  
  if (durationMinutes > 1440) {
    return { valid: false, error: 'Event cannot be longer than 24 hours' };
  }
  
  return { valid: true };
}

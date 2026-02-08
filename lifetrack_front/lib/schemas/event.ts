/**
 * Event and Learning Plan Validation Schemas
 * 
 * Zod schemas for form validation and data integrity
 */

import { z } from 'zod';

// ============================================================================
// Event Schemas
// ============================================================================

export const eventTypeSchema = z.enum(['activity', 'learning', 'meeting', 'reminder', 'custom']);

export const recurrencePatternSchema = z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']);

export const notificationChannelSchema = z.enum(['browser', 'telegram', 'both']);

export const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  channels: z.array(notificationChannelSchema),
  reminderMinutes: z.array(z.number().min(0).max(10080)), // Max 1 week in minutes
});

// Base event schema without refinements (for partial/update operations)
const baseEventSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional(),
  
  type: eventTypeSchema,
  
  startTime: z.string()
    .datetime({ message: 'Invalid start time format' }),
  
  endTime: z.string()
    .datetime({ message: 'Invalid end time format' }),
  
  allDay: z.boolean().default(false),
  
  recurrence: recurrencePatternSchema.default('none'),
  
  recurrenceRule: z.string()
    .optional(),
  
  recurrenceEnd: z.string()
    .datetime({ message: 'Invalid recurrence end date' })
    .optional(),
  
  // Optional relations
  skillId: z.string().optional(),
  activityId: z.string().optional(),
  learningPlanId: z.string().optional(),
  
  notifications: notificationSettingsSchema.default({
    enabled: true,
    channels: ['browser'],
    reminderMinutes: [15],
  }),
  
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code')
    .optional(),
  
  location: z.string()
    .max(200, 'Location must be 200 characters or less')
    .optional(),
  
  attendees: z.array(z.string().email())
    .optional(),
  
  tags: z.array(z.string().max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  
  gmailEventId: z.string().optional(),
});

// Full event schema with refinements
export const eventSchema = baseEventSchema.refine(
  (data) => {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    return end > start;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
).refine(
  (data) => {
    // If recurrence is set (not 'none'), recurrenceRule should be provided
    if (data.recurrence !== 'none' && !data.recurrenceRule) {
      return false;
    }
    return true;
  },
  {
    message: 'Recurrence rule is required when recurrence pattern is set',
    path: ['recurrenceRule'],
  }
);

// Type inference
export type EventFormData = z.infer<typeof eventSchema>;

// Partial schema for updates (all fields optional except type safety)
export const updateEventSchema = baseEventSchema.partial();

// Quick event creation (minimal fields)
export const quickEventSchema = z.object({
  title: z.string().min(1).max(200),
  type: eventTypeSchema,
  startTime: z.string().datetime(),
  durationMinutes: z.number().min(1).max(1440),
  allDay: z.boolean().default(false),
});

// ============================================================================
// Learning Plan Schemas
// ============================================================================

export const scheduleFrequencySchema = z.enum(['daily', 'weekly', 'custom']);

export const scheduleSettingsSchema = z.object({
  frequency: scheduleFrequencySchema,
  
  durationMinutes: z.number()
    .min(15, 'Minimum session duration is 15 minutes')
    .max(480, 'Maximum session duration is 8 hours'),
  
  preferredTimes: z.array(
    z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format (24-hour)')
  ).min(1, 'At least one preferred time is required')
    .max(5, 'Maximum 5 preferred times allowed'),
  
  preferredDays: z.array(
    z.number().min(0).max(6)
  ).min(1, 'At least one preferred day is required'),
  
  autoSchedule: z.boolean().default(true),
});

// Base learning plan schema without refinements (for partial/update operations)
const baseLearningPlanSchema = z.object({
  name: z.string()
    .min(1, 'Plan name is required')
    .max(100, 'Plan name must be 100 characters or less'),
  
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  
  skillIds: z.array(z.string())
    .min(1, 'At least one skill is required')
    .max(10, 'Maximum 10 skills per plan'),
  
  schedule: scheduleSettingsSchema,
  
  targetHoursPerWeek: z.number()
    .min(1, 'Target must be at least 1 hour per week')
    .max(168, 'Target cannot exceed 168 hours per week')
    .optional(),
  
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  
  endDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

// Full learning plan schema with refinements
export const learningPlanSchema = baseLearningPlanSchema.refine(
  (data) => {
    // If endDate is provided, it must be after startDate
    if (data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
).refine(
  (data) => {
    // Start date cannot be in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(data.startDate) >= today;
  },
  {
    message: 'Start date cannot be in the past',
    path: ['startDate'],
  }
);

// Type inference
export type LearningPlanFormData = z.infer<typeof learningPlanSchema>;

// Partial schema for updates
export const updateLearningPlanSchema = baseLearningPlanSchema.partial();

// ============================================================================
// Helper Schemas
// ============================================================================

/**
 * Schema for date range queries
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

/**
 * Schema for event filters
 */
export const eventFilterSchema = z.object({
  type: eventTypeSchema.optional(),
  skillId: z.string().optional(),
  learningPlanId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

/**
 * Schema for notification preferences
 */
export const notificationPreferencesSchema = z.object({
  browserEnabled: z.boolean(),
  telegramEnabled: z.boolean(),
  defaultChannels: z.array(notificationChannelSchema),
  defaultReminderMinutes: z.array(z.number().min(0).max(10080)),
});

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate event data and return typed result
 */
export function validateEvent(data: unknown): { 
  success: true; 
  data: EventFormData 
} | { 
  success: false; 
  error: z.ZodError 
} {
  const result = eventSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, error: result.error };
}

/**
 * Validate learning plan data and return typed result
 */
export function validateLearningPlan(data: unknown): { 
  success: true; 
  data: LearningPlanFormData 
} | { 
  success: false; 
  error: z.ZodError 
} {
  const result = learningPlanSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, error: result.error };
}

/**
 * Extract error messages from Zod error
 */
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  error.issues.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  
  return errors;
}

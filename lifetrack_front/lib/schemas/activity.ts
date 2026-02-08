import { z } from 'zod'

export const activitySchema = z.object({
  skillId: z.string().min(1, 'Skill is required'),
  name: z.string().min(1, 'Activity name is required').max(100, 'Name must be less than 100 characters'),
  duration: z.number().min(1, 'Duration must be at least 1 minute').max(480, 'Duration must be less than 8 hours'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
})

export const createActivitySchema = activitySchema

export const updateActivitySchema = activitySchema.partial()

export type ActivityFormData = z.infer<typeof activitySchema>
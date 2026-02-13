import { z } from 'zod'

/**
 * Zod schema for Note
 */
export const noteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  tags: z.array(z.string()).default([]),
  linkedType: z.enum(['skill', 'activity', 'event', 'learning_plan']).optional(),
  linkedId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Zod schema for creating a note (without server-generated fields)
 */
export const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  tags: z.array(z.string()).default([]),
  linkedType: z.enum(['skill', 'activity', 'event', 'learning_plan']).optional(),
  linkedId: z.string().optional(),
})

/**
 * Zod schema for updating a note (all fields optional)
 */
export const updateNoteSchema = createNoteSchema.partial()

/**
 * Zod schema for note filter options
 */
export const noteFilterSchema = z.object({
  tags: z.array(z.string()).optional(),
  linkedType: z.enum(['skill', 'activity', 'event', 'learning_plan']).optional(),
  linkedId: z.string().optional(),
  search: z.string().optional(),
})

export type NoteSchema = z.infer<typeof noteSchema>
export type CreateNoteSchema = z.infer<typeof createNoteSchema>
export type UpdateNoteSchema = z.infer<typeof updateNoteSchema>
export type NoteFilterSchema = z.infer<typeof noteFilterSchema>

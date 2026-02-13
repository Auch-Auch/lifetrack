'use client'

import { create } from 'zustand'
import type { Note, CreateNoteInput, UpdateNoteInput, NoteFilter } from '@/lib/notes'
import {
  getNotes as apiGetNotes,
  getNoteById as apiGetNoteById,
  searchNotes as apiSearchNotes,
  createNote as apiCreateNote,
  updateNote as apiUpdateNote,
  deleteNote as apiDeleteNote,
  sortByDate,
  getAllTags as getAllTagsHelper,
} from '@/lib/notes'

type NoteState = {
  // State
  notes: Note[]
  loading: boolean
  error: string | null
  
  // CRUD Operations
  fetchNotes: (filter?: NoteFilter) => Promise<void>
  createNote: (input: CreateNoteInput) => Promise<Note>
  updateNote: (id: string, input: UpdateNoteInput) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  getNoteById: (id: string) => Note | undefined
  
  // Query Operations
  searchNotesByQuery: (query: string) => Promise<Note[]>
  listNotes: (options?: {
    tags?: string[]
    linkedType?: string
    linkedId?: string
    sortOrder?: 'asc' | 'desc'
  }) => Note[]
  getAllTags: () => string[]
  
  // Bulk Operations
  bulkDeleteNotes: (ids: string[]) => Promise<void>
  addTagToNote: (noteId: string, tag: string) => Promise<void>
  removeTagFromNote: (noteId: string, tag: string) => Promise<void>
  
  // Error handling
  clearError: () => void
}

export const useNoteStore = create<NoteState>()((set, get) => ({
  notes: [],
  loading: false,
  error: null,
  
  clearError: () => set({ error: null }),
  
  fetchNotes: async (filter) => {
    try {
      set({ loading: true, error: null })
      const result = await apiGetNotes(filter)
      set({ notes: result.nodes, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch notes',
        loading: false
      })
    }
  },
  
  createNote: async (input) => {
    try {
      set({ loading: true, error: null })
      const note = await apiCreateNote(input)
      set(state => ({
        notes: [note, ...state.notes],
        loading: false
      }))
      return note
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create note',
        loading: false
      })
      throw error
    }
  },
  
  updateNote: async (id, input) => {
    try {
      set({ loading: true, error: null })
      const updated = await apiUpdateNote(id, input)
      set(state => ({
        notes: state.notes.map(n => n.id === id ? updated : n),
        loading: false
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update note',
        loading: false
      })
      throw error
    }
  },
  
  deleteNote: async (id) => {
    try {
      set({ loading: true, error: null })
      await apiDeleteNote(id)
      set(state => ({
        notes: state.notes.filter(n => n.id !== id),
        loading: false
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete note',
        loading: false
      })
      throw error
    }
  },
  
  getNoteById: (id) => {
    return get().notes.find(n => n.id === id)
  },
  
  searchNotesByQuery: async (query) => {
    try {
      set({ loading: true, error: null })
      const results = await apiSearchNotes(query)
      set({ loading: false })
      return results
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Search failed',
        loading: false
      })
      return []
    }
  },
  
  listNotes: (options = {}) => {
    let result = [...get().notes]
    
    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      result = result.filter(note =>
        options.tags!.some(tag => note.tags.includes(tag))
      )
    }
    
    // Filter by linked entity
    if (options.linkedType && options.linkedId) {
      result = result.filter(note =>
        note.linkedType === options.linkedType && note.linkedId === options.linkedId
      )
    }
    
    // Sort
    result = sortByDate(result, options.sortOrder || 'desc')
    
    return result
  },
  
  getAllTags: () => {
    return getAllTagsHelper(get().notes)
  },
  
  bulkDeleteNotes: async (ids) => {
    try {
      set({ loading: true, error: null })
      await Promise.all(ids.map(id => apiDeleteNote(id)))
      set(state => ({
        notes: state.notes.filter(n => !ids.includes(n.id)),
        loading: false
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Bulk delete failed',
        loading: false
      })
      throw error
    }
  },
  
  addTagToNote: async (noteId, tag) => {
    const note = get().getNoteById(noteId)
    if (!note) return
    
    const newTags = note.tags.includes(tag) ? note.tags : [...note.tags, tag]
    await get().updateNote(noteId, { tags: newTags })
  },
  
  removeTagFromNote: async (noteId, tag) => {
    const note = get().getNoteById(noteId)
    if (!note) return
    
    const newTags = note.tags.filter(t => t !== tag)
    await get().updateNote(noteId, { tags: newTags })
  },
}))

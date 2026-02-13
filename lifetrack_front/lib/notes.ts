'use client'

import { getClient } from './helpers/api-client'

// Note data model with GraphQL integration
export type Note = {
  id: string
  userId?: string
  title: string
  content: string
  tags: string[]
  linkedType?: string
  linkedId?: string
  createdAt: string
  updatedAt: string
}

export type CreateNoteInput = {
  title: string
  content: string
  tags?: string[]
  linkedType?: string
  linkedId?: string
}

export type UpdateNoteInput = {
  title?: string
  content?: string
  tags?: string[]
  linkedType?: string
  linkedId?: string
}

export type NoteFilter = {
  tags?: string[]
  linkedType?: string
  linkedId?: string
}

// GraphQL Queries
const GET_NOTES_QUERY = `
  query GetNotes($filter: NoteFilter, $limit: Int, $offset: Int) {
    notes(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        id
        title
        content
        tags
        linkedType
        linkedId
        createdAt
        updatedAt
      }
      totalCount
      hasMore
    }
  }
`

const GET_NOTE_QUERY = `
  query GetNote($id: UUID!) {
    note(id: $id) {
      id
      title
      content
      tags
      linkedType
      linkedId
      createdAt
      updatedAt
    }
  }
`

const SEARCH_NOTES_QUERY = `
  query SearchNotes($query: String!) {
    searchNotes(query: $query) {
      id
      title
      content
      tags
      linkedType
      linkedId
      createdAt
      updatedAt
    }
  }
`

const CREATE_NOTE_MUTATION = `
  mutation CreateNote($input: CreateNoteInput!) {
    createNote(input: $input) {
      id
      title
      content
      tags
      linkedType
      linkedId
      createdAt
      updatedAt
    }
  }
`

const UPDATE_NOTE_MUTATION = `
  mutation UpdateNote($id: UUID!, $input: UpdateNoteInput!) {
    updateNote(id: $id, input: $input) {
      id
      title
      content
      tags
      linkedType
      linkedId
      createdAt
      updatedAt
    }
  }
`

const DELETE_NOTE_MUTATION = `
  mutation DeleteNote($id: UUID!) {
    deleteNote(id: $id)
  }
`

// API Functions
export async function getNotes(
  filter?: NoteFilter,
  limit?: number,
  offset?: number
): Promise<{ nodes: Note[]; totalCount: number; hasMore: boolean }> {
  const client = getClient()
  const result = await client.query(GET_NOTES_QUERY, { filter, limit, offset }).toPromise()
  
  if (result.error) {
    console.error('Error fetching notes:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.notes || { nodes: [], totalCount: 0, hasMore: false }
}

export async function getNoteById(id: string): Promise<Note | null> {
  const client = getClient()
  const result = await client.query(GET_NOTE_QUERY, { id }).toPromise()
  
  if (result.error) {
    console.error('Error fetching note:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.note || null
}

export async function searchNotes(query: string): Promise<Note[]> {
  const client = getClient()
  const result = await client.query(SEARCH_NOTES_QUERY, { query }).toPromise()
  
  if (result.error) {
    console.error('Error searching notes:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.searchNotes || []
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const client = getClient()
  const result = await client.mutation(CREATE_NOTE_MUTATION, { input }).toPromise()
  
  if (result.error) {
    console.error('Error creating note:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.createNote
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<Note> {
  const client = getClient()
  const result = await client.mutation(UPDATE_NOTE_MUTATION, { id, input }).toPromise()
  
  if (result.error) {
    console.error('Error updating note:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.updateNote
}

export async function deleteNote(id: string): Promise<boolean> {
  const client = getClient()
  const result = await client.mutation(DELETE_NOTE_MUTATION, { id }).toPromise()
  
  if (result.error) {
    console.error('Error deleting note:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.deleteNote
}

// Helper Functions
export function formatNotePreview(content: string, maxLength: number = 150): string {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength).trim() + '...'
}

export function extractTagsFromContent(content: string): string[] {
  const tagRegex = /#([a-zA-Z0-9_-]+)/g
  const matches = content.matchAll(tagRegex)
  return Array.from(matches, m => m[1])
}

export function getAllTags(notes: Note[]): string[] {
  const tagsSet = new Set<string>()
  notes.forEach(note => {
    note.tags.forEach(tag => tagsSet.add(tag))
  })
  return Array.from(tagsSet).sort()
}

export function sortByDate(notes: Note[], order: 'asc' | 'desc' = 'desc'): Note[] {
  return [...notes].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return order === 'desc' ? dateB - dateA : dateA - dateB
  })
}

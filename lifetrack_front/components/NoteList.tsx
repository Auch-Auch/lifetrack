'use client'

import React, { useState } from 'react'
import NoteCard from './NoteCard'
import type { Note } from '@/lib/notes'
import { Card } from './ui/Card'

type NoteListProps = {
  notes: Note[]
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onNoteClick?: (note: Note) => void
  loading?: boolean
  emptyMessage?: string
}

export default function NoteList({
  notes,
  onEdit,
  onDelete,
  onNoteClick,
  loading = false,
  emptyMessage = 'No notes found'
}: NoteListProps) {
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const sortedNotes = [...notes].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.updatedAt).getTime()
      const dateB = new Date(b.updatedAt).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    } else {
      const comparison = a.title.localeCompare(b.title)
      return sortOrder === 'desc' ? -comparison : comparison
    }
  })
  
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="h-48 animate-pulse bg-[hsl(var(--muted))]">
            <div />
          </Card>
        ))}
      </div>
    )
  }
  
  if (notes.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-[hsl(var(--muted-foreground))] text-lg">{emptyMessage}</p>
      </Card>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center justify-end">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'title')}
          className="px-3 py-1.5 text-sm rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
        >
          <option value="date">Sort by Date</option>
          <option value="title">Sort by Title</option>
        </select>
        
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="px-3 py-1.5 text-sm rounded-[var(--radius)] bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary-hover))] text-[hsl(var(--foreground))] transition-colors"
        >
          {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
        </button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onEdit={onEdit}
            onDelete={onDelete}
            onClick={onNoteClick}
          />
        ))}
      </div>
    </div>
  )
}

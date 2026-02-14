'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useNoteStore } from '@/stores/noteStore'
import { useToast } from '@/stores/toastStore'
import NoteList from '@/components/NoteList'
import NoteForm from '@/components/NoteForm'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Search, X, Tag, ArrowLeft } from 'lucide-react'
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/lib/notes'

type ViewMode = 'list' | 'create' | 'edit' | 'view'

export default function NotesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Note[]>([])
  
  const {
    notes,
    loading,
    error,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    getAllTags,
    searchNotesByQuery,
    clearError,
  } = useNoteStore()
  
  const toast = useToast()
  
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])
  
  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, toast, clearError])
  
  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false)
      setSearchResults([])
      return
    }
    
    setIsSearching(true)
    const results = await searchNotesByQuery(searchQuery)
    setSearchResults(results)
  }
  
  const handleClearSearch = () => {
    setSearchQuery('')
    setIsSearching(false)
    setSearchResults([])
  }
  
  // Filter notes by tags
  const displayedNotes = useMemo(() => {
    const baseNotes = isSearching ? searchResults : notes
    
    if (selectedTags.length === 0) {
      return baseNotes
    }
    
    return baseNotes.filter(note =>
      selectedTags.some(tag => note.tags.includes(tag))
    )
  }, [notes, searchResults, isSearching, selectedTags])
  
  // Get all available tags
  const availableTags = useMemo(() => getAllTags(), [notes])
  
  const handleCreateNote = async (data: CreateNoteInput) => {
    try {
      await createNote(data)
      toast.success('Note created successfully!')
      setViewMode('list')
    } catch (error) {
      toast.error('Failed to create note')
    }
  }
  
  const handleUpdateNote = async (data: UpdateNoteInput) => {
    if (!selectedNote) return
    
    try {
      await updateNote(selectedNote.id, data)
      toast.success('Note updated successfully!')
      setViewMode('list')
      setSelectedNote(null)
    } catch (error) {
      toast.error('Failed to update note')
    }
  }
  
  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return
    
    try {
      await deleteNote(id)
      toast.success('Note deleted successfully!')
      if (viewMode === 'view' || viewMode === 'edit') {
        setViewMode('list')
        setSelectedNote(null)
      }
    } catch (error) {
      toast.error('Failed to delete note')
    }
  }
  
  const handleEditNote = (note: Note) => {
    setSelectedNote(note)
    setViewMode('edit')
  }
  
  const handleViewNote = (note: Note) => {
    setSelectedNote(note)
    setViewMode('view')
  }
  
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }
  
  const renderHeader = () => {
    if (viewMode === 'list') {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Notes</h1>
            <Button onClick={() => setViewMode('create')}>
              <Plus size={20} />
              New Note
            </Button>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="p-1 hover:bg-[hsl(var(--muted))] rounded transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  onClick={handleSearch}
                  className="p-1 hover:bg-[hsl(var(--muted))] rounded transition-colors text-[hsl(var(--primary))]"
                >
                  <Search size={16} />
                </button>
              </div>
            </div>
          </div>
          
          {availableTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <Tag size={16} className="text-[hsl(var(--muted-foreground))]" />
              <span className="text-sm text-[hsl(var(--muted-foreground))]">Filter by tags:</span>
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-[hsl(var(--primary))] text-white'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary)/0.2)]'
                  }`}
                >
                  #{tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-sm text-[hsl(var(--danger))] hover:underline ml-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
          
          {isSearching && (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      )
    }
    
    return (
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => {
            setViewMode('list')
            setSelectedNote(null)
          }}
        >
          <ArrowLeft size={20} />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          {viewMode === 'create' ? 'Create Note' : viewMode === 'edit' ? 'Edit Note' : selectedNote?.title}
        </h1>
      </div>
    )
  }
  
  const renderContent = () => {
    if (viewMode === 'create') {
      return (
        <div className="max-w-6xl mx-auto">
          <NoteForm
            onSubmit={handleCreateNote as (data: CreateNoteInput | UpdateNoteInput) => Promise<void>}
            onCancel={() => setViewMode('list')}
          />
        </div>
      )
    }
    
    if (viewMode === 'edit' && selectedNote) {
      return (
        <div className="max-w-6xl mx-auto">
          <NoteForm
            note={selectedNote}
            onSubmit={handleUpdateNote as (data: CreateNoteInput | UpdateNoteInput) => Promise<void>}
            onCancel={() => setViewMode('list')}
          />
        </div>
      )
    }
    
    if (viewMode === 'view' && selectedNote) {
      return (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {selectedNote.title}
                </h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                  Updated {new Date(selectedNote.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleEditNote(selectedNote)}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => handleDeleteNote(selectedNote.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MarkdownRenderer content={selectedNote.content} />
            {selectedNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-[hsl(var(--border))]">
                {selectedNote.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )
    }
    
    return (
      <NoteList
        notes={displayedNotes}
        onEdit={handleEditNote}
        onDelete={handleDeleteNote}
        onNoteClick={handleViewNote}
        loading={loading}
        emptyMessage={
          isSearching
            ? `No notes found for "${searchQuery}"`
            : selectedTags.length > 0
            ? 'No notes with selected tags'
            : 'No notes yet. Create your first note!'
        }
      />
    )
  }
  
  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {renderHeader()}
      {renderContent()}
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from './ui/Card'
import Button from './ui/Button'
import { Pencil, Trash2, Tag, Calendar, Paperclip, Image as ImageIcon } from 'lucide-react'
import type { Note } from '@/lib/notes'

type NoteCardProps = {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onClick?: (note: Note) => void
}

export default function NoteCard({ note, onEdit, onDelete, onClick }: NoteCardProps) {
  const [showFullContent, setShowFullContent] = useState(false)
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }
  
  const extractAttachments = (content: string): { images: string[], files: any[] } => {
    const images: string[] = []
    const files: any[] = []
    
    // Extract base64 images
    const imgRegex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g
    let match
    while ((match = imgRegex.exec(content)) !== null) {
      images.push(match[2])
    }
    
    // Extract file attachments (stored as JSON in comments)
    const fileRegex = /<!--\s*ATTACHMENT:\s*(\{[^}]+\})\s*-->/g
    while ((match = fileRegex.exec(content)) !== null) {
      try {
        files.push(JSON.parse(match[1]))
      } catch (e) {
        console.error('Failed to parse attachment:', e)
      }
    }
    
    return { images, files }
  }
  
  const getContentWithoutAttachments = (content: string) => {
    return content
      .replace(/!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g, '')
      .replace(/<!--\s*ATTACHMENT:\s*(\{[^}]+\})\s*-->/g, '')
      .trim()
  }
  
  const { images, files } = extractAttachments(note.content)
  const contentText = getContentWithoutAttachments(note.content)
  const previewLength = 200
  const needsExpansion = contentText.length > previewLength
  
  const displayContent = showFullContent || !needsExpansion
    ? contentText
    : contentText.substring(0, previewLength) + '...'

  return (
    <Card hoverable className="group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <h3 
            className="text-lg font-semibold text-[hsl(var(--foreground))] cursor-pointer hover:text-[hsl(var(--primary))] transition-colors"
            onClick={() => onClick?.(note)}
          >
            {note.title}
          </h3>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(note)}
              className="!px-2 !py-1"
            >
              <Pencil size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(note.id)}
              className="!px-2 !py-1 hover:!bg-[hsl(var(--danger))] hover:!text-white"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        <p className="text-[hsl(var(--muted-foreground))] whitespace-pre-wrap break-words">
          {displayContent}
        </p>
        
        {needsExpansion && (
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            className="text-sm text-[hsl(var(--primary))] hover:underline"
          >
            {showFullContent ? 'Show less' : 'Show more'}
          </button>
        )}
        
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {images.slice(0, 4).map((img, idx) => (
              <div key={idx} className="relative aspect-video bg-[hsl(var(--muted))] rounded overflow-hidden">
                <img 
                  src={img} 
                  alt={`Attachment ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {images.length > 4 && (
              <div className="flex items-center justify-center bg-[hsl(var(--muted))] rounded text-[hsl(var(--muted-foreground))]">
                +{images.length - 4} more
              </div>
            )}
          </div>
        )}
        
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {files.map((file, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 bg-[hsl(var(--muted))] rounded text-sm"
              >
                <Paperclip size={14} />
                <span className="text-[hsl(var(--foreground))]">{file.name}</span>
                <span className="text-[hsl(var(--muted-foreground))] text-xs">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
          <Calendar size={14} />
          <span>{formatDate(note.updatedAt)}</span>
        </div>
        
        {note.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag size={14} className="text-[hsl(var(--muted-foreground))]" />
            {note.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-full text-xs font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        
        {(images.length > 0 || files.length > 0) && (
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] ml-auto">
            {images.length > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon size={14} />
                {images.length}
              </span>
            )}
            {files.length > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip size={14} />
                {files.length}
              </span>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

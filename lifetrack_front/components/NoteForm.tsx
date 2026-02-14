'use client'

import React, { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import Input from './ui/Input'
import MarkdownToolbar from './MarkdownToolbar'
import MarkdownRenderer from './MarkdownRenderer'
import { X, Upload, Image as ImageIcon, Paperclip, Eye, Edit3 } from 'lucide-react'
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/lib/notes'

type NoteFormProps = {
  note?: Note
  onSubmit: (data: CreateNoteInput | UpdateNoteInput) => Promise<void>
  onCancel?: () => void
}

type FileAttachment = {
  name: string
  size: number
  type: string
  data?: string // base64 for images
}

export default function NoteForm({ note, onSubmit, onCancel }: NoteFormProps) {
  const [tags, setTags] = useState<string[]>(note?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      title: note?.title || '',
      content: note?.content ? extractContentWithoutAttachments(note.content) : '',
    }
  })
  
  const contentValue = watch('content')
  
  function extractContentWithoutAttachments(content: string): string {
    return content
      .replace(/!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g, '')
      .replace(/<!--\s*ATTACHMENT:\s*(\{[^}]+\})\s*-->/g, '')
      .trim()
  }
  
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = tagInput.trim().replace(/^#/, '')
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag])
        setTagInput('')
      }
    }
  }
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }
  
  const handleInsertMarkdown = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = contentRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentContent = contentValue || ''
    const selectedText = currentContent.substring(start, end)
    const textToInsert = selectedText || placeholder
    
    const newContent =
      currentContent.substring(0, start) +
      before +
      textToInsert +
      after +
      currentContent.substring(end)
    
    setValue('content', newContent)
    
    // Set cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + textToInsert.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    const newAttachments: FileAttachment[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 5MB.`)
        continue
      }
      
      const attachment: FileAttachment = {
        name: file.name,
        size: file.size,
        type: file.type,
      }
      
      // If it's an image, convert to base64
      if (file.type.startsWith('image/')) {
        try {
          const base64 = await fileToBase64(file)
          attachment.data = base64 as string
        } catch (error) {
          console.error('Failed to convert image:', error)
        }
      }
      
      newAttachments.push(attachment)
    }
    
    setAttachments([...attachments, ...newAttachments])
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }
  
  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, idx) => idx !== index))
  }
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
  
  const onFormSubmit = async (data: { title: string; content: string }) => {
    setIsSubmitting(true)
    try {
      let contentWithAttachments = data.content
      
      // Add image attachments as markdown
      attachments.forEach(att => {
        if (att.data && att.type.startsWith('image/')) {
          contentWithAttachments += `\n\n![${att.name}](${att.data})`
        } else {
          // Add file metadata as HTML comment
          const fileInfo = JSON.stringify({
            name: att.name,
            size: att.size,
            type: att.type,
          })
          contentWithAttachments += `\n<!-- ATTACHMENT: ${fileInfo} -->`
        }
      })
      
      const submitData = {
        title: data.title,
        content: contentWithAttachments,
        tags,
      }
      
      await onSubmit(submitData)
      
    } catch (error) {
      console.error('Failed to submit note:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 p-6 rounded-lg bg-[hsl(var(--card)/0.3)] backdrop-blur-sm border border-[hsl(var(--border)/0.3)]">
      <Input
        label="Title"
        placeholder="Enter note title..."
        {...register('title', { required: 'Title is required' })}
        error={errors.title?.message}
      />
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-[hsl(var(--foreground))]">
            Content
          </label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors ${
                !showPreview
                  ? 'bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))]'
                  : 'bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.3)]'
              }`}
            >
              <Edit3 size={12} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors ${
                showPreview
                  ? 'bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))]'
                  : 'bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.3)]'
              }`}
            >
              <Eye size={12} />
              Preview
            </button>
          </div>
        </div>
        
        {!showPreview ? (
          <div>
            <MarkdownToolbar onInsert={handleInsertMarkdown} />
            <textarea
              {...register('content', { required: 'Content is required' })}
              ref={(e) => {
                register('content').ref(e)
                contentRef.current = e
              }}
              rows={14}
              placeholder="Write your note here... Markdown supported!"
              className="w-full px-3 py-2 rounded-b-lg bg-transparent border border-t-0 border-[hsl(var(--border)/0.3)] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] transition-all focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary)/0.5)] focus:border-transparent resize-y"
            />
          </div>
        ) : (
          <div className="min-h-[350px] p-4 rounded-lg border border-[hsl(var(--border)/0.3)] bg-transparent">
            {contentValue ? (
              <MarkdownRenderer content={contentValue} />
            ) : (
              <p className="text-[hsl(var(--muted-foreground))] italic text-sm">
                Nothing to preview yet. Switch to Edit mode to write your note.
              </p>
            )}
          </div>
        )}
        
        {errors.content && (
          <p className="text-sm text-[hsl(var(--danger))] mt-1">{errors.content.message}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1.5 text-[hsl(var(--foreground))]">
          Tags
        </label>
        <div className="space-y-2">
          <Input
            placeholder="Add tags (press Enter or comma)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-full text-sm"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-[hsl(var(--primary)/0.2)] rounded-full p-0.5"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1.5 text-[hsl(var(--foreground))]">
          Attachments
        </label>
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-transparent hover:bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border)/0.3)] transition-colors"
          >
            <Upload size={14} />
            Upload Files
          </button>
          
          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 bg-[hsl(var(--muted)/0.2)] rounded border border-[hsl(var(--border)/0.2)]"
                >
                  {att.type.startsWith('image/') ? (
                    <div className="flex-shrink-0">
                      {att.data ? (
                        <img 
                          src={att.data} 
                          alt={att.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-[hsl(var(--background)/0.3)] rounded flex items-center justify-center">
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-12 h-12 bg-[hsl(var(--background)/0.3)] rounded flex items-center justify-center">
                      <Paperclip size={18} />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                      {att.name}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {formatFileSize(att.size)}
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="flex-shrink-0 p-1 hover:bg-[hsl(var(--background)/0.3)] rounded transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
          Supports images, PDFs, and documents. Max 5MB per file.
        </p>
      </div>
      
      <div className="flex gap-3 pt-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 text-sm font-medium bg-[hsl(var(--primary))] text-white rounded hover:bg-[hsl(var(--primary-hover))] disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isSubmitting && (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {note ? 'Update' : 'Create'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2 text-sm font-medium bg-transparent text-[hsl(var(--foreground))] rounded hover:bg-[hsl(var(--muted))] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

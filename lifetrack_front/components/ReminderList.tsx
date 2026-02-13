'use client'
import React from 'react'
import { format } from 'date-fns'
import { Clock, AlertCircle, Check, Bell, Trash2, RotateCw } from 'lucide-react'
import type { Reminder } from '@/lib/reminders'
import { useReminderStore } from '@/stores/reminderStore'
import Button from './ui/Button'

type Props = {
  reminders: Reminder[]
  onEdit?: (reminder: Reminder) => void
  showActions?: boolean
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'HIGH':
      return 'text-red-600 bg-red-50 dark:bg-red-950'
    case 'MEDIUM':
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950'
    case 'LOW':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950'
    default:
      return 'text-gray-600 bg-gray-50 dark:bg-gray-950'
  }
}

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'HIGH':
      return <AlertCircle size={16} />
    case 'MEDIUM':
      return <Clock size={16} />
    case 'LOW':
      return <Bell size={16} />
    default:
      return <Bell size={16} />
  }
}

export default function ReminderList({ reminders, onEdit, showActions = true }: Props) {
  const { completeReminder, deleteReminder, snoozeReminder } = useReminderStore()
  
  const handleComplete = async (id: string) => {
    try {
      await completeReminder(id)
    } catch (error) {
      console.error('Failed to complete reminder:', error)
    }
  }
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      try {
        await deleteReminder(id)
      } catch (error) {
        console.error('Failed to delete reminder:', error)
      }
    }
  }
  
  const handleSnooze = async (id: string, minutes: number) => {
    try {
      await snoozeReminder(id, minutes)
    } catch (error) {
      console.error('Failed to snooze reminder:', error)
    }
  }
  
  const isOverdue = (reminder: Reminder) => {
    return !reminder.completed && new Date(reminder.dueTime) < new Date()
  }
  
  if (reminders.length === 0) {
    return (
      <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
        <Bell size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg">No reminders found</p>
        <p className="text-sm mt-2">Create a new reminder to get started</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      {reminders.map((reminder) => {
        const overdue = isOverdue(reminder)
        
        return (
          <div
            key={reminder.id}
            className={`
              p-4 rounded-[var(--radius)] border transition-all
              ${reminder.completed 
                ? 'bg-[hsl(var(--muted))] opacity-60 border-[hsl(var(--border))]' 
                : overdue
                  ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800'
                  : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]'
              }
            `}
          >
            <div className="flex items-start gap-3">
              {/* Priority indicator */}
              <div className={`p-2 rounded ${getPriorityColor(reminder.priority)}`}>
                {getPriorityIcon(reminder.priority)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`font-semibold ${reminder.completed ? 'line-through' : ''}`}>
                    {reminder.title}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(reminder.priority)}`}>
                    {reminder.priority}
                  </span>
                </div>
                
                {reminder.description && (
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {reminder.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>
                      {format(new Date(reminder.dueTime), 'MMM d, yyyy h:mm a')}
                    </span>
                    {overdue && (
                      <span className="text-red-600 font-medium ml-1">(Overdue)</span>
                    )}
                  </div>
                  
                  {reminder.repeatPattern !== 'NONE' && (
                    <div className="flex items-center gap-1">
                      <RotateCw size={14} />
                      <span>{reminder.repeatPattern}</span>
                    </div>
                  )}
                  
                  {reminder.notificationChannels.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Bell size={14} />
                      <span>{reminder.notificationChannels.join(', ')}</span>
                    </div>
                  )}
                </div>
                
                {reminder.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {reminder.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {reminder.completed && reminder.completedAt && (
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-2 flex items-center gap-1">
                    <Check size={12} />
                    Completed on {format(new Date(reminder.completedAt), 'MMM d, yyyy h:mm a')}
                  </div>
                )}
              </div>
              
              {/* Actions */}
              {showActions && !reminder.completed && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleComplete(reminder.id)}
                    title="Mark as complete"
                  >
                    <Check size={16} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSnooze(reminder.id, 15)}
                    title="Snooze for 15 minutes"
                  >
                    <Clock size={16} />
                  </Button>
                  
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(reminder)}
                      title="Edit reminder"
                    >
                      Edit
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(reminder.id)}
                    title="Delete reminder"
                    className="text-[hsl(var(--danger))] hover:text-[hsl(var(--danger))]"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              )}
              
              {showActions && reminder.completed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(reminder.id)}
                  title="Delete reminder"
                  className="text-[hsl(var(--danger))] hover:text-[hsl(var(--danger))]"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

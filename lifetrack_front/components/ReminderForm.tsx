'use client'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useReminderStore } from '@/stores/reminderStore'
import type { Reminder, ReminderPriority, RepeatPattern } from '@/lib/reminders'
import Input from './ui/Input'
import Button from './ui/Button'

const reminderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  description: z.string().optional(),
  dueTime: z.string().min(1, 'Due time is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  repeatPattern: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM']),
  repeatRule: z.string().optional(),
  repeatEnd: z.string().optional(),
  notificationChannels: z.array(z.string()),
  reminderTimes: z.array(z.number()),
  tags: z.array(z.string()),
})

type ReminderFormData = z.infer<typeof reminderSchema>

type Props = {
  reminder?: Reminder
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ReminderForm({ reminder, onSuccess, onCancel }: Props) {
  const { createReminder, updateReminder } = useReminderStore()
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(reminder?.tags || [])
  const [reminderTimes, setReminderTimes] = useState<number[]>(reminder?.reminderTimes || [0])
  const [channels, setChannels] = useState<string[]>(reminder?.notificationChannels || ['browser'])
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: reminder ? {
      title: reminder.title,
      description: reminder.description || '',
      dueTime: new Date(reminder.dueTime).toISOString().slice(0, 16),
      priority: reminder.priority,
      repeatPattern: reminder.repeatPattern,
      repeatRule: reminder.repeatRule || '',
      repeatEnd: reminder.repeatEnd ? new Date(reminder.repeatEnd).toISOString().slice(0, 16) : '',
      notificationChannels: reminder.notificationChannels,
      reminderTimes: reminder.reminderTimes,
      tags: reminder.tags,
    } : {
      title: '',
      description: '',
      dueTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16), // 1 hour from now
      priority: 'MEDIUM' as ReminderPriority,
      repeatPattern: 'NONE' as RepeatPattern,
      notificationChannels: ['browser'],
      reminderTimes: [0],
      tags: [],
    }
  })
  
  const repeatPattern = watch('repeatPattern')
  
  const onSubmit = async (data: ReminderFormData) => {
    try {
      const formData = {
        ...data,
        dueTime: new Date(data.dueTime).toISOString(),
        repeatEnd: data.repeatEnd ? new Date(data.repeatEnd).toISOString() : undefined,
        tags,
        reminderTimes,
        notificationChannels: channels,
      }
      
      if (reminder) {
        await updateReminder(reminder.id, formData)
      } else {
        await createReminder(formData)
        reset()
        setTags([])
        setReminderTimes([0])
        setChannels(['browser'])
      }
      onSuccess?.()
    } catch (error) {
      console.error('Failed to save reminder:', error)
    }
  }
  
  const addTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput])
      setTagInput('')
    }
  }
  
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }
  
  const addReminderTime = () => {
    setReminderTimes([...reminderTimes, 15])
  }
  
  const removeReminderTime = (index: number) => {
    setReminderTimes(reminderTimes.filter((_, i) => i !== index))
  }
  
  const updateReminderTime = (index: number, value: number) => {
    const newTimes = [...reminderTimes]
    newTimes[index] = value
    setReminderTimes(newTimes)
  }
  
  const toggleChannel = (channel: string) => {
    if (channels.includes(channel)) {
      setChannels(channels.filter(c => c !== channel))
    } else {
      setChannels([...channels, channel])
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Title"
        {...register('title')}
        error={errors.title?.message}
        placeholder="e.g., Team meeting preparation"
      />
      
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Description
        </label>
        <textarea
          {...register('description')}
          className="w-full px-3 py-2 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent min-h-[100px] text-sm"
          placeholder="Optional description..."
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Due Time"
          type="datetime-local"
          {...register('dueTime')}
          error={errors.dueTime?.message}
        />
        
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Priority
          </label>
          <select
            {...register('priority')}
            className="w-full px-3 py-2 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Repeat Pattern
          </label>
          <select
            {...register('repeatPattern')}
            className="w-full px-3 py-2 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] text-sm"
          >
            <option value="NONE">None</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>
        
        {repeatPattern !== 'NONE' && (
          <Input
            label="Repeat Until"
            type="datetime-local"
            {...register('repeatEnd')}
            error={errors.repeatEnd?.message}
          />
        )}
      </div>
      
      {repeatPattern === 'CUSTOM' && (
        <Input
          label="Custom Repeat Rule (iCal format)"
          {...register('repeatRule')}
          error={errors.repeatRule?.message}
          placeholder="e.g., FREQ=WEEKLY;BYDAY=MO,WE,FR"
        />
      )}
      
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Notification Channels
        </label>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={channels.includes('browser')}
              onChange={() => toggleChannel('browser')}
              className="w-4 h-4"
            />
            <span className="text-sm">Browser</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={channels.includes('telegram')}
              onChange={() => toggleChannel('telegram')}
              className="w-4 h-4"
            />
            <span className="text-sm">Telegram</span>
          </label>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Reminder Times (minutes before)
        </label>
        <div className="space-y-2">
          {reminderTimes.map((time, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="number"
                value={time}
                onChange={(e) => updateReminderTime(index, parseInt(e.target.value) || 0)}
                className="flex-1 px-3 py-2 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] text-sm"
                min={0}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeReminderTime(index)}
                disabled={reminderTimes.length === 1}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="ghost" onClick={addReminderTime} className="w-full sm:w-auto">
            Add Reminder Time
          </Button>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            className="flex-1 px-4 py-3 md:px-3 md:py-2 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] min-h-[44px] text-base md:text-sm"
            placeholder="Add a tag..."
          />
          <Button type="button" variant="ghost" size="sm" onClick={addTag}>
            Add
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[hsl(var(--muted))] text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-[hsl(var(--danger))]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? 'Saving...' : reminder ? 'Update' : 'Create'} Reminder
        </Button>
      </div>
    </form>
  )
}

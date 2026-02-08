'use client'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { activitySchema, type ActivityFormData } from '@/lib/schemas/activity'
import { useActivityStore } from '@/stores/activityStore'
import { useToast } from '@/stores/toastStore'
import { getTodayDate } from '@/lib/activities'
import type { Activity } from '@/lib/activities'
import Input from './ui/Input'
import Button from './ui/Button'
import { getSkills } from '@/lib/skills'

type Props = {
  activity?: Activity
  skillId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ActivityForm({ activity, skillId, onSuccess, onCancel }: Props) {
  const { createActivity, updateActivity } = useActivityStore()
  const toast = useToast()
  const skills = getSkills()
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: activity ? {
      skillId: activity.skillId,
      name: activity.name,
      duration: activity.duration,
      date: activity.date,
      notes: activity.notes || '',
    } : {
      skillId: skillId || skills[0]?.id || '',
      name: '',
      duration: 30,
      date: getTodayDate(),
      notes: '',
    }
  })
  
  const onSubmit = async (data: ActivityFormData) => {
    try {
      if (activity) {
        updateActivity(activity.id, data)
        toast.success('Activity updated successfully!')
      } else {
        createActivity(data)
        toast.success('Activity created successfully!')
        reset()
      }
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save activity')
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Skill
        </label>
        <select
          {...register('skillId')}
          className="w-full px-3 py-2 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
          disabled={!!skillId}
        >
          {skills.map(skill => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
        {errors.skillId && (
          <p className="text-sm text-[hsl(var(--danger))] mt-1">{errors.skillId.message}</p>
        )}
      </div>
      
      <Input
        label="Activity Name"
        {...register('name')}
        error={errors.name?.message}
        placeholder="e.g., Practice React hooks"
      />
      
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Duration (minutes)"
          type="number"
          {...register('duration', { valueAsNumber: true })}
          error={errors.duration?.message}
          min={1}
          max={480}
        />
        
        <Input
          label="Date"
          type="date"
          {...register('date')}
          error={errors.date?.message}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Notes (optional)
        </label>
        <textarea
          {...register('notes')}
          className="w-full px-3 py-2 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent resize-none"
          rows={3}
          placeholder="What did you work on?"
        />
        {errors.notes && (
          <p className="text-sm text-[hsl(var(--danger))] mt-1">{errors.notes.message}</p>
        )}
      </div>
      
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {activity ? 'Update' : 'Create'} Activity
        </Button>
      </div>
    </form>
  )
}
/**
 * EventForm Component
 * 
 * Comprehensive form for creating and editing calendar events
 * Supports recurrence, notifications, and skill/activity linking
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventSchema, type EventFormData } from '../../lib/schemas/event';
import type { Event, EventType, RecurrencePattern } from '../../lib/events';
import { useEventStore } from '../../stores/eventStore';
import { getSkills } from '../../lib/skills';
import { useActivityStore } from '../../stores/activityStore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Bell, Repeat } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

// ============================================================================
// Component Props
// ============================================================================

interface EventFormProps {
  event?: Event; // If provided, form is in edit mode
  initialDate?: Date; // For pre-filling date when creating
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ============================================================================
// EventForm Component
// ============================================================================

export default function EventForm({
  event,
  initialDate,
  onSuccess,
  onCancel,
}: EventFormProps) {
  const createEvent = useEventStore((state) => state.createEvent);
  const updateEvent = useEventStore((state) => state.updateEvent);
  const activities = useActivityStore((state) => state.activities);
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const skills = getSkills();
  
  // Initialize form with react-hook-form + zod
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Partial<EventFormData>>({
    resolver: zodResolver(eventSchema) as never,
    defaultValues: event
      ? {
          ...event,
        }
      : {
          title: '',
          type: 'custom',
          startTime: initialDate
            ? initialDate.toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
          endTime: initialDate
            ? new Date(initialDate.getTime() + 60 * 60 * 1000)
                .toISOString()
                .slice(0, 16)
            : new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
          allDay: false,
          recurrence: 'none',
          notifications: {
            enabled: true,
            channels: ['browser'],
            reminderMinutes: [15],
          },
        },
  });
  
  const watchType = watch('type');
  const watchColor = watch('color');
  
  // Handle form submission
  const onSubmit = async (data: Partial<EventFormData>) => {
    try {
      if (event) {
        // Update existing event
        updateEvent(event.id, data);
      } else {
        // Create new event
        createEvent(data);
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };
  
  // Event type options
  const eventTypes: { value: EventType; label: string; icon: string }[] = [
    { value: 'activity', label: 'Activity', icon: '🎯' },
    { value: 'learning', label: 'Learning', icon: '📚' },
    { value: 'meeting', label: 'Meeting', icon: '👥' },
    { value: 'reminder', label: 'Reminder', icon: '⏰' },
    { value: 'custom', label: 'Custom', icon: '📌' },
  ];
  
  // Recurrence options
  const recurrenceOptions: { value: RecurrencePattern; label: string }[] = [
    { value: 'none', label: 'Does not repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom...' },
  ];
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <Input
        label="Title"
        {...register('title')}
        error={errors.title?.message}
        placeholder="Event title"
        autoFocus
      />
      
      {/* Event Type */}
      <div>
        <label className="block text-sm font-medium mb-2">Type</label>
        <div className="grid grid-cols-5 gap-2">
          {eventTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setValue('type', type.value)}
              className={`p-3 rounded-lg border-2 transition-all ${
                watchType === type.value
                  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]'
                  : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]'
              }`}
            >
              <div className="text-2xl mb-1">{type.icon}</div>
              <div className="text-xs font-medium">{type.label}</div>
            </button>
          ))}
        </div>
        {errors.type && (
          <p className="text-sm text-[hsl(var(--danger))] mt-1">
            {errors.type.message}
          </p>
        )}
      </div>
      
      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start"
          type="datetime-local"
          {...register('startTime')}
          error={errors.startTime?.message}
        />
        <Input
          label="End"
          type="datetime-local"
          {...register('endTime')}
          error={errors.endTime?.message}
        />
      </div>
      
      {/* All Day */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          {...register('allDay')}
          className="w-4 h-4 rounded border-[hsl(var(--border))]"
        />
        <span className="text-sm">All day event</span>
      </label>
      
      {/* Description */}
      <Input
        label="Description (optional)"
        as="textarea"
        {...register('description')}
        error={errors.description?.message}
        placeholder="Add details..."
        rows={3}
      />
      
      {/* Recurrence */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium mb-2">
          <Repeat className="w-4 h-4" />
          Repeat
        </label>
        <select
          {...register('recurrence')}
          className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        >
          {recurrenceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-[hsl(var(--primary))] hover:underline"
      >
        {showAdvanced ? 'Hide' : 'Show'} advanced options
      </button>
      
      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-4 p-4 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
          {/* Link to Skill */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Link to Skill (optional)
            </label>
            <select
              {...register('skillId')}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
            >
              <option value="">No skill</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Link to Activity */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Link to Activity (optional)
            </label>
            <select
              {...register('activityId')}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
            >
              <option value="">No activity</option>
              {activities.slice(0, 20).map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name} ({activity.date})
                </option>
              ))}
            </select>
          </div>
          
          {/* Location */}
          <Input
            label="Location (optional)"
            {...register('location')}
            error={errors.location?.message}
            placeholder="Add location..."
          />
          
          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Color (optional)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-10 h-10 rounded-lg border-2 border-[hsl(var(--border))] cursor-pointer"
                style={{ backgroundColor: watchColor || '#6b7280' }}
              />
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                {watchColor || 'Default'}
              </span>
            </div>
            {showColorPicker && (
              <div className="mt-2">
                <HexColorPicker
                  color={watchColor || '#6b7280'}
                  onChange={(color) => setValue('color', color)}
                />
              </div>
            )}
          </div>
          
          {/* Notifications */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Bell className="w-4 h-4" />
              Notifications
            </label>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                {...register('notifications.enabled')}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Enable notifications</span>
            </label>
            <Input
              label="Reminder (minutes before)"
              type="number"
              {...register('notifications.reminderMinutes.0', {
                valueAsNumber: true,
              })}
              placeholder="15"
              min="0"
              max="10080"
            />
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-[hsl(var(--border))]">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {event ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
}

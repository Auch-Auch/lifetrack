/**
 * EventForm Component
 * 
 * Comprehensive form for creating and editing calendar events
 * Supports recurrence, notifications, and skill/activity linking
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { eventSchema, updateEventSchema, type EventFormData } from '../../lib/schemas/event';
import type { Event, EventType, RecurrencePattern } from '../../lib/events';
import type { Skill } from '../../lib/skills';
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
  const [skills, setSkills] = useState<Skill[]>([]);
  
  // Load skills
  useEffect(() => {
    getSkills().then(setSkills);
  }, []);
  
  // Convert RFC3339 to datetime-local format
  const convertToDateTimeLocal = (rfc3339: string) => {
    if (!rfc3339) return '';
    // RFC3339: "2026-02-11T10:00:00Z" or "2026-02-11T10:00:00+00:00"
    // datetime-local needs: "2026-02-11T10:00"
    // Simply remove the seconds and timezone parts
    return rfc3339.slice(0, 16);
  };
  
  // Convert datetime-local format to RFC3339
  const convertToRFC3339 = (dateTimeLocal: string) => {
    if (!dateTimeLocal) return dateTimeLocal;
    // datetime-local format: "2026-02-13T14:30"
    // Add seconds and 'Z' for UTC: "2026-02-13T14:30:00Z"
    return `${dateTimeLocal}:00Z`;
  };
  
  // Preprocessing schema to convert datetime-local to RFC3339 before validation
  // Use updateEventSchema for edits (all fields optional) or eventSchema for create
  const schema = event ? updateEventSchema : eventSchema;
  const preprocessedSchema = z.preprocess(
    (data: any) => {
      if (!data) return data;
      return {
        ...data,
        startTime: data.startTime ? convertToRFC3339(data.startTime) : data.startTime,
        endTime: data.endTime ? convertToRFC3339(data.endTime) : data.endTime,
        recurrenceEnd: data.recurrenceEnd ? convertToRFC3339(data.recurrenceEnd) : data.recurrenceEnd,
      };
    },
    schema
  );
  
  // Initialize form with react-hook-form + zod
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Partial<EventFormData>>({
    resolver: zodResolver(preprocessedSchema) as never,
    defaultValues: event
      ? {
          title: event.title,
          description: event.description,
          type: event.type,
          startTime: convertToDateTimeLocal(event.startTime),
          endTime: convertToDateTimeLocal(event.endTime),
          allDay: event.allDay,
          location: event.location,
          color: event.color,
          recurrence: event.recurrence,
          recurrenceRule: event.recurrenceRule,
          recurrenceEnd: event.recurrenceEnd ? convertToDateTimeLocal(event.recurrenceEnd) : undefined,
          skillId: event.skillId,
          notifications: event.notifications ? {
            enabled: event.notifications.enabled ?? true,
            channels: (event.notifications.channels || ['browser']) as ('browser' | 'telegram' | 'both')[],
            reminderMinutes: event.notifications.reminderMinutes || [15],
          } : {
            enabled: true,
            channels: ['browser' as const],
            reminderMinutes: [15],
          },
        }
      : {
          title: '',
          type: 'CUSTOM',
          startTime: initialDate
            ? initialDate.toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
          endTime: initialDate
            ? new Date(initialDate.getTime() + 60 * 60 * 1000)
                .toISOString()
                .slice(0, 16)
            : new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
          allDay: false,
          recurrence: 'NONE',
          notifications: {
            enabled: true,
            channels: ['browser' as const],
            reminderMinutes: [10],
          },
        },
  });
  
  const watchType = watch('type');
  const watchColor = watch('color');
  
  // Handle form submission
  const onSubmit = async (data: Partial<EventFormData>) => {
    try {
      // Data is already in RFC3339 format from preprocessing
      // Empty strings are converted to undefined by schema preprocessing
      if (event) {
        // Update existing event
        await updateEvent(event.id, data);
      } else {
        // Create new event
        await createEvent(data as any);
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };
  
  // Event type options - only LEARNING and CUSTOM
  const eventTypes: { value: EventType; label: string; icon: string }[] = [
    { value: 'LEARNING', label: 'Learning', icon: '📚' },
    { value: 'CUSTOM', label: 'Custom', icon: '📌' },
  ];
  
  // Recurrence options
  const recurrenceOptions: { value: RecurrencePattern; label: string }[] = [
    { value: 'NONE', label: 'Does not repeat' },
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'CUSTOM', label: 'Custom...' },
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
        <div className="grid grid-cols-2 gap-2">
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
              placeholder="10"
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

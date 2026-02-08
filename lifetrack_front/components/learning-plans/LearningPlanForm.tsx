/**
 * LearningPlanForm Component
 * 
 * Form for creating and editing learning plans with auto-scheduling
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { learningPlanSchema, type LearningPlanFormData } from '../../lib/schemas/event';
import type { LearningPlan } from '../../lib/events';
import { useLearningPlanStore } from '../../stores/learningPlanStore';
import { getSkills } from '../../lib/skills';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Calendar, Zap } from 'lucide-react';

// ============================================================================
// Component Props
// ============================================================================

interface LearningPlanFormProps {
  plan?: LearningPlan; // If provided, form is in edit mode
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ============================================================================
// LearningPlanForm Component
// ============================================================================

export default function LearningPlanForm({
  plan,
  onSuccess,
  onCancel,
}: LearningPlanFormProps) {
  const createPlan = useLearningPlanStore((state) => state.createPlan);
  const updatePlan = useLearningPlanStore((state) => state.updatePlan);
  
  const skills = getSkills();
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    plan?.skillIds || []
  );
  
  // Get today's date for min validation
  const today = new Date().toISOString().split('T')[0];
  
  // Initialize form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Partial<LearningPlanFormData>>({
    resolver: zodResolver(learningPlanSchema) as never,
    defaultValues: plan
      ? {
          ...plan,
          startDate: plan.startDate,
          endDate: plan.endDate || undefined,
        }
      : {
          name: '',
          schedule: {
            frequency: 'weekly',
            durationMinutes: 60,
            preferredTimes: ['09:00'],
            preferredDays: [1, 2, 3, 4, 5], // Mon-Fri
            autoSchedule: true,
          },
          startDate: today,
        },
  });
  
  // Watch form values for conditional rendering
  
  // Handle skill selection
  const toggleSkill = (skillId: string) => {
    const newSelection = selectedSkills.includes(skillId)
      ? selectedSkills.filter((id) => id !== skillId)
      : [...selectedSkills, skillId];
    
    setSelectedSkills(newSelection);
    setValue('skillIds', newSelection);
  };
  
  // Handle form submission
  const onSubmit = async (data: Partial<LearningPlanFormData>) => {
    try {
      if (plan) {
        updatePlan(plan.id, data);
      } else {
        createPlan(data);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save learning plan:', error);
    }
  };
  
  // Day options
  const dayOptions = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Plan Name */}
      <Input
        label="Plan Name"
        {...register('name')}
        error={errors.name?.message}
        placeholder="e.g., Morning Study Routine"
        autoFocus
      />
      
      {/* Description */}
      <Input
        label="Description (optional)"
        as="textarea"
        {...register('description')}
        error={errors.description?.message}
        placeholder="What will you focus on?"
        rows={3}
      />
      
      {/* Select Skills */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Select Skills *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-3 border border-[hsl(var(--border))] rounded-lg">
          {skills.map((skill) => (
            <label
              key={skill.id}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                selectedSkills.includes(skill.id)
                  ? 'bg-[hsl(var(--primary)/0.1)] border-2 border-[hsl(var(--primary))]'
                  : 'bg-[hsl(var(--muted)/0.3)] border-2 border-transparent hover:border-[hsl(var(--border))]'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedSkills.includes(skill.id)}
                onChange={() => toggleSkill(skill.id)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium truncate">{skill.name}</span>
            </label>
          ))}
        </div>
        {errors.skillIds && (
          <p className="text-sm text-[hsl(var(--danger))] mt-1">
            {errors.skillIds.message}
          </p>
        )}
      </div>
      
      {/* Schedule Settings */}
      <div className="p-4 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] space-y-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Calendar className="w-5 h-5" />
          Schedule Settings
        </h3>
        
        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium mb-2">Frequency</label>
          <select
            {...register('schedule.frequency')}
            className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        
        {/* Duration */}
        <Input
          label="Session Duration (minutes)"
          type="number"
          {...register('schedule.durationMinutes', { valueAsNumber: true })}
          error={errors.schedule?.durationMinutes?.message}
          min="15"
          max="480"
          step="15"
        />
        
        {/* Preferred Days */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Preferred Days
          </label>
          <div className="flex gap-2 flex-wrap">
            {dayOptions.map((day) => (
              <label
                key={day.value}
                className={`px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                  watch('schedule.preferredDays')?.includes(day.value)
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]'
                }`}
              >
                <input
                  type="checkbox"
                  value={day.value}
                  {...register('schedule.preferredDays')}
                  className="hidden"
                />
                <span className="text-sm font-medium">{day.label}</span>
              </label>
            ))}
          </div>
          {errors.schedule?.preferredDays && (
            <p className="text-sm text-[hsl(var(--danger))] mt-1">
              {errors.schedule.preferredDays.message}
            </p>
          )}
        </div>
        
        {/* Preferred Time */}
        <Input
          label="Preferred Time (24-hour format)"
          type="time"
          {...register('schedule.preferredTimes.0')}
          error={errors.schedule?.preferredTimes?.[0]?.message}
        />
        
        {/* Auto-schedule Toggle */}
        <label className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] cursor-pointer">
          <input
            type="checkbox"
            {...register('schedule.autoSchedule')}
            className="w-5 h-5 rounded"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium">
              <Zap className="w-4 h-4 text-[hsl(var(--warning))]" />
              Auto-schedule Sessions
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Automatically create calendar events based on your preferences
            </p>
          </div>
        </label>
      </div>
      
      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date"
          type="date"
          {...register('startDate')}
          error={errors.startDate?.message}
          min={today}
        />
        <Input
          label="End Date (optional)"
          type="date"
          {...register('endDate')}
          error={errors.endDate?.message}
          min={watch('startDate') || today}
        />
      </div>
      
      {/* Target Hours */}
      <Input
        label="Target Hours per Week (optional)"
        type="number"
        {...register('targetHoursPerWeek', { valueAsNumber: true })}
        error={errors.targetHoursPerWeek?.message}
        placeholder="e.g., 10"
        min="1"
        max="168"
      />
      
      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-[hsl(var(--border))]">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {plan ? 'Update Plan' : 'Create Plan'}
        </Button>
      </div>
    </form>
  );
}

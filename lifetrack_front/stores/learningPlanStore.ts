/**
 * Learning Plan Store
 * 
 * Global state management for learning plans with localStorage persistence
 * and auto-scheduling capabilities
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
import type { LearningPlan } from '../lib/events';
import { generateId, getTodayDate, calculatePlanProgress, createBasicEvent } from '../lib/events';
import { findAvailableSlots, findBestSlot } from '../lib/helpers/event';
import { useEventStore } from './eventStore';
import { useToastStore } from './toastStore';
import type { Event } from '../lib/events';

// ============================================================================
// Store Interface
// ============================================================================

interface LearningPlanStore {
  // State
  plans: LearningPlan[];
  initialized: boolean;
  
  // CRUD Operations
  createPlan: (planData: Omit<LearningPlan, 'id' | 'completedHours' | 'createdAt' | 'updatedAt'>) => LearningPlan;
  updatePlan: (id: string, updates: Partial<LearningPlan>) => void;
  deletePlan: (id: string) => void;
  getPlan: (id: string) => LearningPlan | undefined;
  
  // Query Operations
  getActivePlans: () => LearningPlan[];
  getPlansBySkill: (skillId: string) => LearningPlan[];
  
  // Auto-scheduling
  generateSchedule: (planId: string, startDate: string, endDate: string) => Event[];
  syncWithCalendar: (planId: string) => void;
  
  // Progress Tracking
  updateProgress: (planId: string, hoursCompleted: number) => void;
  incrementProgress: (planId: string, minutes: number) => void;
  
  // Initialization
  initialize: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useLearningPlanStore = create<LearningPlanStore>()(
  persist(
    (set, get) => ({
      // Initial state
      plans: [],
      initialized: false,
      
      // ========================================================================
      // CRUD Operations
      // ========================================================================
      
      createPlan: (planData) => {
        const now = new Date().toISOString();
        const newPlan: LearningPlan = {
          ...planData,
          id: generateId('plan'),
          completedHours: 0,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          plans: [...state.plans, newPlan],
        }));
        
        useToastStore.getState().addToast('Learning plan created', 'success');
        
        // Auto-generate schedule if enabled
        if (newPlan.schedule.autoSchedule) {
          get().syncWithCalendar(newPlan.id);
        }
        
        return newPlan;
      },
      
      updatePlan: (id, updates) => {
        const plan = get().getPlan(id);
        if (!plan) return;
        
        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        
        useToastStore.getState().addToast('Learning plan updated', 'success');
        
        // Re-generate schedule if auto-schedule is enabled and schedule changed
        if (updates.schedule && plan.schedule.autoSchedule) {
          get().syncWithCalendar(id);
        }
      },
      
      deletePlan: (id) => {
        // Delete associated events from calendar
        const eventStore = useEventStore.getState();
        const planEvents = eventStore.events.filter((event) => event.learningPlanId === id);
        const eventIds = planEvents.map((event) => event.id);
        
        if (eventIds.length > 0) {
          eventStore.bulkDeleteEvents(eventIds);
        }
        
        set((state) => ({
          plans: state.plans.filter((plan) => plan.id !== id),
        }));
        
        useToastStore.getState().addToast('Learning plan deleted', 'success');
      },
      
      getPlan: (id) => {
        return get().plans.find((plan) => plan.id === id);
      },
      
      // ========================================================================
      // Query Operations
      // ========================================================================
      
      getActivePlans: () => {
        const today = getTodayDate();
        return get().plans.filter((plan) => {
          const isStarted = plan.startDate <= today;
          const isNotEnded = !plan.endDate || plan.endDate >= today;
          return isStarted && isNotEnded;
        });
      },
      
      getPlansBySkill: (skillId) => {
        return get().plans.filter((plan) => 
          plan.skillIds.includes(skillId)
        );
      },
      
      // ========================================================================
      // Auto-scheduling
      // ========================================================================
      
      generateSchedule: (planId, startDate, endDate) => {
        const plan = get().getPlan(planId);
        if (!plan) {
          useToastStore.getState().addToast('Learning plan not found', 'error');
          return [];
        }
        
        const eventStore = useEventStore.getState();
        const existingEvents = eventStore.getEventsInRange(startDate, endDate);
        
        const generatedEvents: Event[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Iterate through each day in the range
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const dayOfWeek = date.getDay();
          
          // Check if this day is in preferred days
          if (!plan.schedule.preferredDays.includes(dayOfWeek)) {
            continue;
          }
          
          // Skip based on frequency
          if (plan.schedule.frequency === 'weekly') {
            // Only schedule once per week (on the first preferred day of each week)
            const firstPreferredDay = Math.min(...plan.schedule.preferredDays);
            if (dayOfWeek !== firstPreferredDay) {
              continue;
            }
          }
          
          // Find available slots for this day
          const availableSlots = findAvailableSlots(
            existingEvents,
            date,
            plan.schedule.durationMinutes
          );
          
          if (availableSlots.length === 0) {
            continue; // No available slots on this day
          }
          
          // Find best slot based on preferred times
          const bestSlot = findBestSlot(availableSlots, plan.schedule.preferredTimes);
          
          if (!bestSlot) {
            continue;
          }
          
          // Create event for this slot
          const eventData = createBasicEvent(
            `${plan.name} Session`,
            bestSlot.start,
            plan.schedule.durationMinutes,
            'learning'
          );
          
          const event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
            ...eventData,
            description: plan.description,
            learningPlanId: plan.id,
            skillId: plan.skillIds[0], // Use first skill as primary
            tags: ['auto-scheduled', 'learning-plan'],
          };
          
          const createdEvent = {
            ...event,
            id: generateId('event'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Event;
          
          generatedEvents.push(createdEvent);
          existingEvents.push(createdEvent); // Add to existing to avoid conflicts
        }
        
        return generatedEvents;
      },
      
      syncWithCalendar: (planId) => {
        const plan = get().getPlan(planId);
        if (!plan || !plan.schedule.autoSchedule) {
          return;
        }
        
        const eventStore = useEventStore.getState();
        
        // Delete existing auto-generated events for this plan
        const existingPlanEvents = eventStore.events.filter(
          (event) => 
            event.learningPlanId === planId && 
            event.tags?.includes('auto-scheduled')
        );
        
        if (existingPlanEvents.length > 0) {
          eventStore.bulkDeleteEvents(existingPlanEvents.map((e) => e.id));
        }
        
        // Generate new schedule
        const startDate = plan.startDate > getTodayDate() ? plan.startDate : getTodayDate();
        const endDate = plan.endDate || new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0];
        
        const newEvents = get().generateSchedule(planId, startDate, endDate);
        
        if (newEvents.length > 0) {
          eventStore.bulkCreateEvents(newEvents);
          useToastStore.getState().addToast(`Generated ${newEvents.length} learning sessions`, 'success');
        } else {
          useToastStore.getState().addToast('No available time slots found', 'warning');
        }
      },
      
      // ========================================================================
      // Progress Tracking
      // ========================================================================
      
      updateProgress: (planId, hoursCompleted) => {
        set((state) => ({
          plans: state.plans.map((plan) =>
            plan.id === planId
              ? {
                  ...plan,
                  completedHours: hoursCompleted,
                  updatedAt: new Date().toISOString(),
                }
              : plan
          ),
        }));
      },
      
      incrementProgress: (planId, minutes) => {
        const plan = get().getPlan(planId);
        if (!plan) return;
        
        const additionalHours = minutes / 60;
        const newCompletedHours = plan.completedHours + additionalHours;
        
        get().updateProgress(planId, newCompletedHours);
      },
      
      // ========================================================================
      // Initialization
      // ========================================================================
      
      initialize: () => {
        if (get().initialized) return;
        
        // Re-sync active plans with auto-schedule enabled
        const activePlans = get().getActivePlans();
        activePlans.forEach((plan) => {
          if (plan.schedule.autoSchedule) {
            // Sync without toast notification on initialization
            const eventStore = useEventStore.getState();
            const startDate = getTodayDate();
            const endDate = plan.endDate || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0];
            const events = get().generateSchedule(plan.id, startDate, endDate);
            
            if (events.length > 0) {
              eventStore.bulkCreateEvents(events);
            }
          }
        });
        
        set({ initialized: true });
      },
    }),
    {
      name: 'learning_plans_v1', // localStorage key
      partialize: (state) => ({
        plans: state.plans,
        // Don't persist initialized flag
      }),
    }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get progress stats for a plan
 * 
 * Note: Results are memoized to prevent infinite loops
 */
export function usePlanProgress(planId: string) {
  const getPlan = useLearningPlanStore((state) => state.getPlan);
  
  return useMemo(() => {
    const plan = getPlan(planId);
    if (!plan) return null;
    return calculatePlanProgress(plan);
  }, [getPlan, planId]);
}

/**
 * Get all plans count
 */
export function usePlanCount() {
  return useLearningPlanStore((state) => state.plans.length);
}

/**
 * Get active plans count
 * 
 * Note: Results are memoized to prevent infinite loops
 */
export function useActivePlanCount() {
  const plans = useLearningPlanStore((state) => state.plans);
  
  return useMemo(() => {
    const today = getTodayDate();
    return plans.filter((plan) => {
      if (!plan.endDate) {
        return plan.startDate <= today;
      }
      return plan.startDate <= today && plan.endDate >= today;
    }).length;
  }, [plans]);
}

/**
 * Check if a skill has any learning plans
 */
export function useHasSkillPlans(skillId: string) {
  return useLearningPlanStore((state) => 
    state.plans.some((plan) => plan.skillIds.includes(skillId))
  );
}

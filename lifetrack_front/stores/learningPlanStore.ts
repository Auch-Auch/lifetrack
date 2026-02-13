/**
 * Learning Plan Store with GraphQL Integration
 * 
 * Global state management for learning plans
 */

'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import type { LearningPlan, CreateLearningPlanInput, UpdateLearningPlanInput, Event } from '../lib/events';
import {
  getLearningPlans as apiGetLearningPlans,
  getLearningPlanById as apiGetLearningPlanById,
  createLearningPlan as apiCreateLearningPlan,
  updateLearningPlan as apiUpdateLearningPlan,
  deleteLearningPlan as apiDeleteLearningPlan,
  generateSchedule as apiGenerateSchedule,
  calculatePlanProgress,
} from '../lib/events';
import { useToastStore } from './toastStore';

// ============================================================================
// Store Interface
// ============================================================================

interface LearningPlanStore {
  // State
  plans: LearningPlan[];
  loading: boolean;
  error: string | null;
  
  // CRUD Operations
  fetchPlans: () => Promise<void>;
  createPlan: (planData: CreateLearningPlanInput) => Promise<LearningPlan>;
  updatePlan: (id: string, updates: UpdateLearningPlanInput) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  getPlan: (id: string) => LearningPlan | undefined;
  
  // Query Operations
  getActivePlans: () => LearningPlan[];
  getPlansBySkill: (skillId: string) => LearningPlan[];
  
  // Auto-scheduling
  generateSchedule: (planId: string) => Promise<Event[]>;
  
  // Error handling
  clearError: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useLearningPlanStore = create<LearningPlanStore>()((set, get) => ({
  // Initial state
  plans: [],
  loading: false,
  error: null,
  
  clearError: () => set({ error: null }),
  
  // ========================================================================
  // API Operations
  // ========================================================================
  
  fetchPlans: async () => {
    try {
      set({ loading: true, error: null });
      const plans = await apiGetLearningPlans();
      set({ plans, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch learning plans',
        loading: false
      });
    }
  },
  
  createPlan: async (planData) => {
    try {
      set({ loading: true, error: null });
      const newPlan = await apiCreateLearningPlan(planData);
      set(state => ({
        plans: [...state.plans, newPlan],
        loading: false
      }));
      useToastStore.getState().addToast('Learning plan created', 'success');
      return newPlan;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create learning plan',
        loading: false
      });
      useToastStore.getState().addToast('Failed to create learning plan', 'error');
      throw error;
    }
  },
  
  updatePlan: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      const updated = await apiUpdateLearningPlan(id, updates);
      set(state => ({
        plans: state.plans.map(plan => plan.id === id ? updated : plan),
        loading: false
      }));
      useToastStore.getState().addToast('Learning plan updated', 'success');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update learning plan',
        loading: false
      });
      useToastStore.getState().addToast('Failed to update learning plan', 'error');
      throw error;
    }
  },
  
  deletePlan: async (id) => {
    try {
      set({ loading: true, error: null });
      await apiDeleteLearningPlan(id);
      set(state => ({
        plans: state.plans.filter(plan => plan.id !== id),
        loading: false
      }));
      useToastStore.getState().addToast('Learning plan deleted', 'success');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete learning plan',
        loading: false
      });
      useToastStore.getState().addToast('Failed to delete learning plan', 'error');
      throw error;
    }
  },
  
  getPlan: (id) => {
    return get().plans.find(plan => plan.id === id);
  },
  
  // ========================================================================
  // Client-side Query Operations
  // ========================================================================
  
  getActivePlans: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().plans.filter(plan => {
      const isStarted = plan.startDate <= today;
      const isNotEnded = !plan.endDate || plan.endDate >= today;
      return isStarted && isNotEnded;
    });
  },
  
  getPlansBySkill: (skillId) => {
    return get().plans.filter(plan => plan.skillIds.includes(skillId));
  },
  
  // ========================================================================
  // Auto-scheduling
  // ========================================================================
  
  generateSchedule: async (planId) => {
    try {
      set({ loading: true, error: null });
      const events = await apiGenerateSchedule(planId);
      set({ loading: false });
      useToastStore.getState().addToast('Schedule generated successfully', 'success');
      return events;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to generate schedule',
        loading: false
      });
      useToastStore.getState().addToast('Failed to generate schedule', 'error');
      throw error;
    }
  },
}));

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
    const today = new Date().toISOString().split('T')[0];
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

'use client'
import { create } from 'zustand'
import type { Activity } from '../lib/activities'
import {
  getActivities,
  getActivityById as apiGetActivityById,
  getActiveSession as apiGetActiveSession,
  createActivity as apiCreateActivity,
  updateActivity as apiUpdateActivity,
  deleteActivity as apiDeleteActivity,
  startSession as apiStartSession,
  pauseSession as apiPauseSession,
  resumeSession as apiResumeSession,
  stopSession as apiStopSession,
  CreateActivityInput,
  UpdateActivityInput,
  getTodayDate,
  calculateDuration,
} from '../lib/activities'

type ActivityState = {
  activities: Activity[]
  activeSession: Activity | null
  loading: boolean
  error: string | null
  
  // Actions
  fetchActivities: (skillId?: string, startDate?: string, endDate?: string) => Promise<void>
  fetchActiveSession: () => Promise<void>
  createActivity: (input: CreateActivityInput) => Promise<Activity>
  updateActivity: (id: string, input: UpdateActivityInput) => Promise<void>
  deleteActivity: (id: string) => Promise<void>
  getActivityById: (id: string) => Activity | undefined
  listActivities: (skillId?: string) => Activity[]
  getActivitiesByDateRange: (startDate: string, endDate: string, skillId?: string) => Activity[]
  
  // Session actions
  startSession: (skillId: string, name: string) => Promise<Activity>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  stopSession: (notes?: string) => Promise<void>
  
  // Clear error
  clearError: () => void
}

export const useActivityStore = create<ActivityState>()((set, get) => ({
  activities: [],
  activeSession: null,
  loading: false,
  error: null,
  
  clearError: () => set({ error: null }),
  
  fetchActivities: async (skillId, startDate, endDate) => {
    try {
      set({ loading: true, error: null })
      const filter = skillId || startDate || endDate ? {
        skillId,
        startDate,
        endDate
      } : undefined
      
      const result = await getActivities(filter)
      set({ activities: result.nodes, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch activities',
        loading: false 
      })
    }
  },
  
  fetchActiveSession: async () => {
    try {
      const session = await apiGetActiveSession()
      // Only update if session actually changed to avoid unnecessary re-renders
      const current = get().activeSession
      if (JSON.stringify(current) !== JSON.stringify(session)) {
        set({ activeSession: session })
      }
    } catch (error) {
      console.error('Failed to fetch active session:', error)
      // Don't clear activeSession on error to avoid flickering
    }
  },
  
  createActivity: async (input) => {
    try {
      set({ loading: true, error: null })
      const activity = await apiCreateActivity(input)
      set(state => ({
        activities: [activity, ...state.activities],
        loading: false
      }))
      return activity
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create activity',
        loading: false 
      })
      throw error
    }
  },
  
  updateActivity: async (id, input) => {
    try {
      set({ loading: true, error: null })
      const updated = await apiUpdateActivity(id, input)
      set(state => ({
        activities: state.activities.map(a => a.id === id ? updated : a),
        activeSession: state.activeSession?.id === id ? updated : state.activeSession,
        loading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update activity',
        loading: false 
      })
      throw error
    }
  },
  
  deleteActivity: async (id) => {
    try {
      set({ loading: true, error: null })
      await apiDeleteActivity(id)
      set(state => ({
        activities: state.activities.filter(a => a.id !== id),
        activeSession: state.activeSession?.id === id ? null : state.activeSession,
        loading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete activity',
        loading: false 
      })
      throw error
    }
  },
  
  getActivityById: (id) => {
    return get().activities.find(a => a.id === id)
  },
  
  listActivities: (skillId) => {
    const { activities } = get()
    if (!skillId) return activities.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    return activities
      .filter(a => a.skillId === skillId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  },
  
  getActivitiesByDateRange: (startDate, endDate, skillId) => {
    const { activities } = get()
    return activities.filter(a => {
      const matchesDateRange = a.date >= startDate && a.date <= endDate
      const matchesSkill = !skillId || a.skillId === skillId
      return matchesDateRange && matchesSkill
    })
  },
  
  startSession: async (skillId, name) => {
    const { activeSession } = get()
    
    // Prevent multiple active sessions
    if (activeSession) {
      throw new Error('Another session is already active. Please stop it first.')
    }
    
    try {
      set({ loading: true, error: null })
      const activity = await apiStartSession(skillId, name)
      set(state => ({
        activities: [activity, ...state.activities],
        activeSession: activity,
        loading: false
      }))
      return activity
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to start session',
        loading: false 
      })
      throw error
    }
  },
  
  pauseSession: async () => {
    const { activeSession } = get()
    if (!activeSession || activeSession.status !== 'ACTIVE') return
    
    try {
      set({ loading: true, error: null })
      const updated = await apiPauseSession(activeSession.id)
      set(state => ({
        activities: state.activities.map(a => a.id === updated.id ? updated : a),
        activeSession: updated,
        loading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to pause session',
        loading: false 
      })
      throw error
    }
  },
  
  resumeSession: async () => {
    const { activeSession } = get()
    if (!activeSession || activeSession.status !== 'PAUSED') return
    
    try {
      set({ loading: true, error: null })
      const updated = await apiResumeSession(activeSession.id)
      set(state => ({
        activities: state.activities.map(a => a.id === updated.id ? updated : a),
        activeSession: updated,
        loading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to resume session',
        loading: false 
      })
      throw error
    }
  },
  
  stopSession: async (notes) => {
    const { activeSession } = get()
    if (!activeSession) return
    
    try {
      set({ loading: true, error: null })
      const updated = await apiStopSession(activeSession.id, notes)
      set(state => ({
        activities: state.activities.map(a => a.id === updated.id ? updated : a),
        activeSession: null,
        loading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to stop session',
        loading: false 
      })
      throw error
    }
  },
}))
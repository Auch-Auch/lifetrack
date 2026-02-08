'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Activity, CreateActivityInput, UpdateActivityInput } from '../lib/activities'
import { migrateCommitments, getTodayDate, calculateDuration } from '../lib/activities'

type ActivityState = {
  activities: Activity[]
  activeSession: Activity | null
  migrated: boolean
  
  // Actions
  initialize: () => void
  createActivity: (input: CreateActivityInput) => Activity
  updateActivity: (id: string, input: UpdateActivityInput) => void
  deleteActivity: (id: string) => void
  getActivityById: (id: string) => Activity | undefined
  listActivities: (skillId?: string) => Activity[]
  getActivitiesByDateRange: (startDate: string, endDate: string, skillId?: string) => Activity[]
  
  // Session actions
  startSession: (skillId: string, name: string) => Activity
  pauseSession: () => void
  resumeSession: () => void
  stopSession: (notes?: string) => void
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities: [],
      activeSession: null,
      migrated: false,
      
      initialize: () => {
        const { migrated, activities } = get()
        if (!migrated) {
          const migratedActivities = migrateCommitments()
          set({ 
            activities: [...migratedActivities, ...activities],
            migrated: true 
          })
        }
      },
      
      createActivity: (input) => {
        const activity: Activity = {
          ...input,
          id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          status: input.status || 'completed',
        }
        
        set(state => ({
          activities: [...state.activities, activity]
        }))
        
        return activity
      },
      
      updateActivity: (id, input) => {
        set(state => ({
          activities: state.activities.map(a =>
            a.id === id ? { ...a, ...input } : a
          ),
          activeSession: state.activeSession?.id === id
            ? { ...state.activeSession, ...input }
            : state.activeSession
        }))
      },
      
      deleteActivity: (id) => {
        set(state => ({
          activities: state.activities.filter(a => a.id !== id),
          activeSession: state.activeSession?.id === id ? null : state.activeSession
        }))
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
      
      startSession: (skillId, name) => {
        const { activeSession } = get()
        
        // Prevent multiple active sessions
        if (activeSession) {
          throw new Error('Another session is already active. Please stop it first.')
        }
        
        const activity: Activity = {
          id: `session-${Date.now()}`,
          skillId,
          name,
          duration: 0,
          date: getTodayDate(),
          status: 'active',
          startedAt: new Date().toISOString(),
          pausedDuration: 0,
          createdAt: new Date().toISOString(),
        }
        
        set(state => ({
          activities: [...state.activities, activity],
          activeSession: activity
        }))
        
        return activity
      },
      
      pauseSession: () => {
        const { activeSession, updateActivity } = get()
        if (!activeSession || activeSession.status !== 'active') return
        
        updateActivity(activeSession.id, {
          status: 'paused',
          pausedAt: new Date().toISOString(),
        })
      },
      
      resumeSession: () => {
        const { activeSession, updateActivity } = get()
        if (!activeSession || activeSession.status !== 'paused') return
        
        const pausedAt = activeSession.pausedAt
        if (!pausedAt) return
        
        const pausedTime = Date.now() - new Date(pausedAt).getTime()
        const totalPausedDuration = (activeSession.pausedDuration || 0) + pausedTime
        
        updateActivity(activeSession.id, {
          status: 'active',
          pausedAt: undefined,
          pausedDuration: totalPausedDuration,
        })
      },
      
      stopSession: (notes) => {
        const { activeSession, updateActivity } = get()
        if (!activeSession) return
        
        // If paused, calculate paused duration
        let finalPausedDuration = activeSession.pausedDuration || 0
        if (activeSession.status === 'paused' && activeSession.pausedAt) {
          const pausedTime = Date.now() - new Date(activeSession.pausedAt).getTime()
          finalPausedDuration += pausedTime
        }
        
        const duration = calculateDuration(
          activeSession.startedAt!,
          finalPausedDuration
        )
        
        updateActivity(activeSession.id, {
          status: 'completed',
          duration: Math.max(1, duration), // At least 1 minute
          notes: notes || activeSession.notes,
          startedAt: undefined,
          pausedAt: undefined,
          pausedDuration: undefined,
        })
        
        set({ activeSession: null })
      },
    }),
    {
      name: 'activities_v1',
      partialize: (state) => ({
        activities: state.activities,
        activeSession: state.activeSession,
        migrated: state.migrated,
      }),
    }
  )
)

// Initialize migration on module load (client-side only)
if (typeof window !== 'undefined') {
  useActivityStore.getState().initialize()
}
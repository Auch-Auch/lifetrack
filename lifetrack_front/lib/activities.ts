'use client'

import { getClient } from './helpers/api-client'

export type Activity = {
  id: string
  userId?: string
  skillId: string
  name: string
  duration: number // in minutes
  date: string // YYYY-MM-DD
  notes?: string
  status: 'COMPLETED' | 'ACTIVE' | 'PAUSED'
  startedAt?: string // ISO timestamp
  pausedAt?: string // ISO timestamp
  pausedDuration?: number // accumulated paused time in milliseconds
  createdAt: string // ISO timestamp
}

export type CreateActivityInput = {
  skillId: string
  name: string
  duration: number
  date: string
  notes?: string
  status: Activity['status']
}

export type UpdateActivityInput = {
  name?: string
  duration?: number
  date?: string
  notes?: string
  status?: Activity['status']
}

export type ActivityFilter = {
  skillId?: string
  startDate?: string
  endDate?: string
  status?: Activity['status']
}

export type ActivityStats = {
  totalActivities: number
  totalMinutes: number
  totalHours: number
  skillBreakdown: SkillStats[]
  period: string
}

export type SkillStats = {
  skillId: string
  skillName: string
  activityCount: number
  totalMinutes: number
  totalHours: number
}

// GraphQL Queries
const GET_ACTIVITIES_QUERY = `
  query GetActivities($filter: ActivityFilter, $limit: Int, $offset: Int) {
    activities(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        id
        skillId
        name
        duration
        date
        notes
        status
        startedAt
        pausedAt
        pausedDuration
        createdAt
      }
      totalCount
      hasMore
    }
  }
`

const GET_ACTIVITY_QUERY = `
  query GetActivity($id: UUID!) {
    activity(id: $id) {
      id
      skillId
      name
      duration
      date
      notes
      status
      startedAt
      pausedAt
      pausedDuration
      createdAt
    }
  }
`

const GET_ACTIVE_SESSION_QUERY = `
  query GetActiveSession {
    activeSession {
      id
      skillId
      name
      duration
      date
      notes
      status
      startedAt
      pausedAt
      pausedDuration
      createdAt
    }
  }
`

const GET_ACTIVITY_STATS_QUERY = `
  query GetActivityStats($startDate: Date!, $endDate: Date!) {
    activityStats(startDate: $startDate, endDate: $endDate) {
      totalActivities
      totalMinutes
      totalHours
      skillBreakdown {
        skillId
        skillName
        activityCount
        totalMinutes
        totalHours
      }
      period
    }
  }
`

const CREATE_ACTIVITY_MUTATION = `
  mutation CreateActivity($input: CreateActivityInput!) {
    createActivity(input: $input) {
      id
      skillId
      name
      duration
      date
      notes
      status
      startedAt
      pausedAt
      pausedDuration
      createdAt
    }
  }
`

const UPDATE_ACTIVITY_MUTATION = `
  mutation UpdateActivity($id: UUID!, $input: UpdateActivityInput!) {
    updateActivity(id: $id, input: $input) {
      id
      skillId
      name
      duration
      date
      notes
      status
      startedAt
      pausedAt
      pausedDuration
      createdAt
    }
  }
`

const DELETE_ACTIVITY_MUTATION = `
  mutation DeleteActivity($id: UUID!) {
    deleteActivity(id: $id)
  }
`

const START_SESSION_MUTATION = `
  mutation StartSession($skillId: UUID!, $name: String!) {
    startSession(skillId: $skillId, name: $name) {
      id
      skillId
      name
      duration
      date
      notes
      status
      startedAt
      pausedAt
      pausedDuration
      createdAt
    }
  }
`

const PAUSE_SESSION_MUTATION = `
  mutation PauseSession($id: UUID!) {
    pauseSession(id: $id) {
      id
      skillId
      name
      duration
      date
      notes
      status
      startedAt
      pausedAt
      pausedDuration
      createdAt
    }
  }
`

const RESUME_SESSION_MUTATION = `
  mutation ResumeSession($id: UUID!) {
    resumeSession(id: $id) {
      id
      skillId
      name
      duration
      date
      notes
      status
      startedAt
      pausedAt
      pausedDuration
      createdAt
    }
  }
`

const STOP_SESSION_MUTATION = `
  mutation StopSession($id: UUID!, $notes: String) {
    stopSession(id: $id, notes: $notes) {
      id
      skillId
      name
      duration
      date
      notes
      status
      startedAt
      pausedAt
      pausedDuration
      createdAt
    }
  }
`

// API Functions
export async function getActivities(
  filter?: ActivityFilter,
  limit?: number,
  offset?: number
): Promise<{ nodes: Activity[]; totalCount: number; hasMore: boolean }> {
  const client = getClient()
  const result = await client.query(GET_ACTIVITIES_QUERY, { filter, limit, offset }).toPromise()
  
  if (result.error) {
    console.error('Error fetching activities:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.activities || { nodes: [], totalCount: 0, hasMore: false }
}

export async function getActivityById(id: string): Promise<Activity | null> {
  const client = getClient()
  const result = await client.query(GET_ACTIVITY_QUERY, { id }).toPromise()
  
  if (result.error) {
    console.error('Error fetching activity:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.activity || null
}

export async function getActiveSession(): Promise<Activity | null> {
  const client = getClient()
  // Use network-only to bypass cache and always fetch fresh data
  const result = await client.query(
    GET_ACTIVE_SESSION_QUERY, 
    {},
    { requestPolicy: 'network-only' }
  ).toPromise()
  
  if (result.error) {
    console.error('Error fetching active session:', result.error)
    // Don't throw, just return null to prevent app from freezing
    return null
  }
  
  return result.data?.activeSession || null
}

export async function getActivityStats(startDate: string, endDate: string): Promise<ActivityStats> {
  const client = getClient()
  const result = await client.query(GET_ACTIVITY_STATS_QUERY, { startDate, endDate }).toPromise()
  
  if (result.error) {
    console.error('Error fetching activity stats:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.activityStats
}

export async function createActivity(input: CreateActivityInput): Promise<Activity> {
  const client = getClient()
  const result = await client.mutation(CREATE_ACTIVITY_MUTATION, { input }).toPromise()
  
  if (result.error) {
    console.error('Error creating activity:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.createActivity
}

export async function updateActivity(id: string, input: UpdateActivityInput): Promise<Activity> {
  const client = getClient()
  const result = await client.mutation(UPDATE_ACTIVITY_MUTATION, { id, input }).toPromise()
  
  if (result.error) {
    console.error('Error updating activity:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.updateActivity
}

export async function deleteActivity(id: string): Promise<boolean> {
  const client = getClient()
  const result = await client.mutation(DELETE_ACTIVITY_MUTATION, { id }).toPromise()
  
  if (result.error) {
    console.error('Error deleting activity:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.deleteActivity
}

export async function startSession(skillId: string, name: string): Promise<Activity> {
  const client = getClient()
  const result = await client.mutation(START_SESSION_MUTATION, { skillId, name }).toPromise()
  
  if (result.error) {
    console.error('Error starting session:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.startSession
}

export async function pauseSession(id: string): Promise<Activity> {
  const client = getClient()
  const result = await client.mutation(PAUSE_SESSION_MUTATION, { id }).toPromise()
  
  if (result.error) {
    console.error('Error pausing session:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.pauseSession
}

export async function resumeSession(id: string): Promise<Activity> {
  const client = getClient()
  const result = await client.mutation(RESUME_SESSION_MUTATION, { id }).toPromise()
  
  if (result.error) {
    console.error('Error resuming session:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.resumeSession
}

export async function stopSession(id: string, notes?: string): Promise<Activity> {
  const client = getClient()
  const result = await client.mutation(STOP_SESSION_MUTATION, { id, notes }).toPromise()
  
  if (result.error) {
    console.error('Error stopping session:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.stopSession
}

// Helper Functions (keep these as they're utility functions)
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function calculateDuration(startedAt: string, pausedDuration: number = 0): number {
  const start = new Date(startedAt).getTime()
  const now = Date.now()
  const elapsed = now - start - pausedDuration
  return Math.floor(elapsed / 1000 / 60) // Convert to minutes
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// Migration function from commitments to activities (keep for backward compatibility)
export function migrateCommitments(): Activity[] {
  try {
    const commitmentsRaw = localStorage.getItem('skill_commitments_v1')
    if (!commitmentsRaw) return []
    
    const commitments = JSON.parse(commitmentsRaw) as Record<string, Array<{
      id: string
      date: string
      text: string
    }>>
    
    const activities: Activity[] = []
    
    Object.entries(commitments).forEach(([skillId, commits]) => {
      commits.forEach(commit => {
        activities.push({
          id: `migrated-${commit.id}`,
          skillId,
          name: commit.text || 'Practice session',
          duration: 30, // Default 30 minutes for migrated commitments
          date: commit.date,
          notes: commit.text,
          status: 'COMPLETED',
          createdAt: new Date(commit.date).toISOString(),
        })
      })
    })
    
    return activities
  } catch (error) {
    console.error('Migration failed:', error)
    return []
  }
}
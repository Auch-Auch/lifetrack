export type Activity = {
  id: string
  skillId: string
  name: string
  duration: number // in minutes
  date: string // YYYY-MM-DD
  notes?: string
  status: 'completed' | 'active' | 'paused'
  startedAt?: string // ISO timestamp
  pausedAt?: string // ISO timestamp
  pausedDuration?: number // accumulated paused time in milliseconds
  createdAt: string // ISO timestamp
}

export type CreateActivityInput = Omit<Activity, 'id' | 'createdAt' | 'status'> & {
  status?: Activity['status']
}

export type UpdateActivityInput = Partial<Omit<Activity, 'id' | 'createdAt'>>

// Format duration in minutes to readable string (e.g., "1h 30m")
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

// Calculate duration from start time considering paused periods
export function calculateDuration(startedAt: string, pausedDuration: number = 0): number {
  const start = new Date(startedAt).getTime()
  const now = Date.now()
  const elapsed = now - start - pausedDuration
  return Math.floor(elapsed / 1000 / 60) // Convert to minutes
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// Migration function from commitments to activities
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
          status: 'completed',
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
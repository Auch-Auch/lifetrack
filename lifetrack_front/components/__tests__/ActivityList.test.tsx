import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ActivityList from '@/components/ActivityList'
import { useActivityStore } from '@/stores/activityStore'
import { useToast } from '@/stores/toastStore'
import * as skillsModule from '@/lib/skills'

// Mock the stores and utilities
jest.mock('@/stores/activityStore')
jest.mock('@/stores/toastStore')
jest.mock('@/lib/skills')

// Mock window.confirm
global.confirm = jest.fn(() => true)

const mockActivities = [
  {
    id: 'act-1',
    skillId: 'skill-1',
    name: 'Study React',
    duration: 60,
    date: '2026-02-20',
    status: 'COMPLETED' as const,
    notes: 'Completed hooks tutorial',
  },
  {
    id: 'act-2',
    skillId: 'skill-2',
    name: 'Practice Guitar',
    duration: 45,
    date: '2026-02-19',
    status: 'COMPLETED' as const,
    notes: 'Scales and chords',
  },
  {
    id: 'act-3',
    skillId: 'skill-1',
    name: 'Code Review',
    duration: 30,
    date: '2026-02-18',
    status: 'COMPLETED' as const,
  },
]

describe('ActivityList', () => {
  const mockDeleteActivity = jest.fn()
  const mockToastSuccess = jest.fn()
  const mockToastError = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock getSkillById
    ;(skillsModule.getSkillById as jest.Mock).mockImplementation((id: string) => 
      Promise.resolve({
        id,
        name: id === 'skill-1' ? 'Programming' : 'Guitar',
        category: 'Test',
      })
    )
    
    // Mock useActivityStore
    ;(useActivityStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        activities: mockActivities,
        deleteActivity: mockDeleteActivity,
      }
      return typeof selector === 'function' ? selector(state) : state
    })
    
    // Mock useToast
    ;(useToast as unknown as jest.Mock).mockReturnValue({
      success: mockToastSuccess,
      error: mockToastError,
    })
  })

  it('renders list of activities', async () => {
    render(<ActivityList />)
    
    await waitFor(() => {
      expect(screen.getByText('Study React')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    expect(screen.getByText('Practice Guitar')).toBeInTheDocument()
    expect(screen.getByText('Code Review')).toBeInTheDocument()
  })

  it('filters activities by skillId', async () => {
    render(<ActivityList skillId="skill-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('Study React')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    expect(screen.getByText('Code Review')).toBeInTheDocument()
    // Practice Guitar should not be shown (different skillId)
    expect(screen.queryByText('Practice Guitar')).not.toBeInTheDocument()
  })

  it('shows empty state when no activities match filters', async () => {
    // Create a store with no activities
    ;(useActivityStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        activities: [],
        deleteActivity: mockDeleteActivity,
      }
      return typeof selector === 'function' ? selector(state) : state
    })

    render(<ActivityList />)
    
    await waitFor(() => {
      const emptyMessage = screen.queryByText(/no activities/i) || screen.queryByText(/empty/i)
      expect(emptyMessage).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays activity durations correctly', async () => {
    render(<ActivityList />)
    
    await waitFor(() => {
      expect(screen.getByText('Study React')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Check for duration text (1h 0m for 60 minutes)
    const durationElements = screen.getAllByText(/1h 0m|45m/i)
    expect(durationElements.length).toBeGreaterThan(0)
  })

  it('sorts activities by date in descending order by default', async () => {
    render(<ActivityList />)
    
    await waitFor(() => {
      expect(screen.getByText('Study React')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const activityNames = screen.getAllByText(/Study React|Practice Guitar|Code Review/)
    // Most recent (2026-02-20) should appear first
    expect(activityNames[0]).toHaveTextContent('Study React')
  })
})

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ActivityForm from '@/components/ActivityForm'
import { useActivityStore } from '@/stores/activityStore'
import { useToast } from '@/stores/toastStore'
import * as skillsModule from '@/lib/skills'

// Mock the stores and skills module
jest.mock('@/stores/activityStore')
jest.mock('@/stores/toastStore')
jest.mock('@/lib/skills')

const mockSkills = [
  { id: 'skill-1', name: 'Programming', category: 'Development' },
  { id: 'skill-2', name: 'Guitar', category: 'Music' },
]

describe('ActivityForm', () => {
  const mockCreateActivity = jest.fn()
  const mockUpdateActivity = jest.fn()
  const mockToastSuccess = jest.fn()
  const mockToastError = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock getSkills to resolve with test data
    ;(skillsModule.getSkills as jest.Mock).mockResolvedValue(mockSkills)
    
    // Mock useActivityStore
    ;(useActivityStore as unknown as jest.Mock).mockReturnValue({
      createActivity: mockCreateActivity,
      updateActivity: mockUpdateActivity,
    })
    
    // Mock useToast
    ;(useToast as unknown as jest.Mock).mockReturnValue({
      success: mockToastSuccess,
      error: mockToastError,
    })
  })

  it('renders the form with all fields', async () => {
    render(<ActivityForm />)
    
    // Wait for skills to load and form to render
    await waitFor(() => {
      const skillSelect = screen.getByRole('combobox') as HTMLSelectElement
      expect(skillSelect).toBeInTheDocument()
      expect(skillSelect.options.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
    
    expect(screen.getByLabelText(/activity name/i)).toBeInTheDocument()
  })

  it('disables skill selection when skillId is provided', async () => {
    render(<ActivityForm skillId="skill-1" />)
    
    // Wait for form to render with skills loaded
    await waitFor(() => {
      const skillSelect = screen.getByRole('combobox') as HTMLSelectElement
      expect(skillSelect.options.length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    const skillSelect = screen.getByRole('combobox') as HTMLSelectElement
    expect(skillSelect).toBeDisabled()
  })

  it('renders with existing activity data', async () => {
    const existingActivity = {
      id: 'act-1',
      skillId: 'skill-1',
      name: 'Old Activity',
      duration: 30,
      date: '2026-02-20',
      status: 'COMPLETED' as const,
    }

    render(<ActivityForm activity={existingActivity} />)
    
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/activity name/i) as HTMLInputElement
      expect(nameInput.value).toBe('Old Activity')
    }, { timeout: 3000 })
  })

  it('shows skill select with correct options', async () => {
    render(<ActivityForm />)
    
    await waitFor(() => {
      const skillSelect = screen.getByRole('combobox') as HTMLSelectElement
      expect(skillSelect.options.length).toBe(2)
    }, { timeout: 3000 })

    const skillSelect = screen.getByRole('combobox') as HTMLSelectElement
    const optionTexts = Array.from(skillSelect.options).map(opt => opt.text)
    expect(optionTexts).toContain('Programming')
    expect(optionTexts).toContain('Guitar')
  })
})

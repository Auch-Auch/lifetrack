'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Filter, Search } from 'lucide-react'
import { useReminderStore } from '@/stores/reminderStore'
import type { Reminder, ReminderPriority } from '@/lib/reminders'
import ReminderList from '@/components/ReminderList'
import ReminderForm from '@/components/ReminderForm'
import Button from '@/components/ui/Button'

type FilterType = 'all' | 'upcoming' | 'overdue' | 'completed'

export default function RemindersPage() {
  const {
    reminders,
    loading,
    error,
    fetchReminders,
    fetchUpcomingReminders,
    fetchOverdueReminders,
  } = useReminderStore()
  
  const [showForm, setShowForm] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | undefined>()
  const [filter, setFilter] = useState<FilterType>('upcoming')
  const [priorityFilter, setPriorityFilter] = useState<ReminderPriority | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const loadReminders = useCallback(() => {
    switch (filter) {
      case 'upcoming':
        fetchUpcomingReminders(50)
        break
      case 'overdue':
        fetchOverdueReminders()
        break
      case 'completed':
        fetchReminders({ completed: true }, 50)
        break
      case 'all':
        fetchReminders({}, 50)
        break
    }
  }, [filter, fetchUpcomingReminders, fetchOverdueReminders, fetchReminders])
  
  useEffect(() => {
    loadReminders()
  }, [loadReminders])
  
  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setShowForm(true)
  }
  
  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingReminder(undefined)
    loadReminders()
  }
  
  const handleFormCancel = () => {
    setShowForm(false)
    setEditingReminder(undefined)
  }
  
  // Filter reminders based on priority and search
  const filteredReminders = reminders.filter(reminder => {
    const matchesPriority = priorityFilter === 'all' || reminder.priority === priorityFilter
    const matchesSearch = searchQuery === '' || 
      reminder.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reminder.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reminder.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesPriority && matchesSearch
  })
  
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--foreground))]">Reminders</h1>
          <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] mt-1">
            Manage your reminders and notifications
          </p>
        </div>
        
        <Button
          onClick={() => {
            setEditingReminder(undefined)
            setShowForm(!showForm)
          }}
          className="w-full sm:w-auto"
        >
          <Plus size={18} className="mr-2" />
          New Reminder
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {showForm && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-4 sm:p-6 mb-6 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">
            {editingReminder ? 'Edit Reminder' : 'Create New Reminder'}
          </h2>
          <ReminderForm
            reminder={editingReminder}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-3 sm:p-4 mb-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'upcoming' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('upcoming')}
              className="flex-1 sm:flex-none"
            >
              Upcoming
            </Button>
            <Button
              variant={filter === 'overdue' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('overdue')}
              className="flex-1 sm:flex-none"
            >
              Overdue
            </Button>
            <Button
              variant={filter === 'completed' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('completed')}
              className="flex-1 sm:flex-none"
            >
              Completed
            </Button>
            <Button
              variant={filter === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
              className="flex-1 sm:flex-none"
            >
              All
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Priority filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as ReminderPriority | 'all')}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              >
                <option value="all">All Priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            
            {/* Search */}
            <div className="flex-1 flex items-center gap-2">
              <Search size={16} className="flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reminders..."
                className="flex-1 px-3 py-1.5 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">Total Reminders</p>
          <p className="text-xl sm:text-2xl font-bold mt-1">{reminders.length}</p>
        </div>
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">Upcoming</p>
          <p className="text-xl sm:text-2xl font-bold mt-1">
            {reminders.filter(r => !r.completed && new Date(r.dueTime) > new Date()).length}
          </p>
        </div>
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">Overdue</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-red-600">
            {reminders.filter(r => !r.completed && new Date(r.dueTime) < new Date()).length}
          </p>
        </div>
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">Completed</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-green-600">
            {reminders.filter(r => r.completed).length}
          </p>
        </div>
      </div>
      
      {/* Reminders list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
          <p className="mt-4 text-[hsl(var(--muted-foreground))]">Loading reminders...</p>
        </div>
      ) : (
        <ReminderList
          reminders={filteredReminders}
          onEdit={handleEdit}
          showActions={true}
        />
      )}
    </div>
  )
}

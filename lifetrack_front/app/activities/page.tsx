'use client'
import React, { useState, useMemo, useEffect } from 'react'
import { useActivityStore } from '@/stores/activityStore'
import { getSkills } from '@/lib/skills'
import { formatDuration, getTodayDate } from '@/lib/activities'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import ActivityList from '@/components/ActivityList'
import ActivityForm from '@/components/ActivityForm'
import { Plus, Clock, Calendar, TrendingUp, Filter, ArrowUpDown } from 'lucide-react'
import type { Activity } from '@/lib/activities'
import type { Skill } from '@/lib/skills'

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
type SortOption = 'date-desc' | 'date-asc' | 'duration-desc' | 'duration-asc' | 'name-asc' | 'name-desc'

export default function ActivitiesPage() {
  const activities = useActivityStore((state) => state.activities)
  const fetchActivities = useActivityStore((state) => state.fetchActivities)
  const [skills, setSkills] = useState<Skill[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [filterSkillId, setFilterSkillId] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [showFilters, setShowFilters] = useState(false)
  
  // Load skills and activities on mount
  useEffect(() => {
    getSkills().then(setSkills)
    fetchActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Get date range based on filter
  const getDateRange = () => {
    const today = new Date()
    const endDate = today.toISOString().split('T')[0]
    
    switch (dateFilter) {
      case 'today':
        return { start: endDate, end: endDate }
      case 'week': {
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay())
        return { start: startOfWeek.toISOString().split('T')[0], end: endDate }
      }
      case 'month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        return { start: startOfMonth.toISOString().split('T')[0], end: endDate }
      }
      case 'year': {
        const startOfYear = new Date(today.getFullYear(), 0, 1)
        return { start: startOfYear.toISOString().split('T')[0], end: endDate }
      }
      case 'custom':
        return { start: customStartDate, end: customEndDate }
      default:
        return { start: '', end: '' }
    }
  }
  
  // Calculate stats
  const stats = useMemo(() => {
    const today = getTodayDate()
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const weekStart = startOfWeek.toISOString().split('T')[0]
    
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    const monthStart = startOfMonth.toISOString().split('T')[0]
    
    const todayMinutes = activities
      .filter(a => a.date === today && a.status === 'COMPLETED')
      .reduce((sum, a) => sum + a.duration, 0)
    
    const weekMinutes = activities
      .filter(a => a.date >= weekStart && a.status === 'COMPLETED')
      .reduce((sum, a) => sum + a.duration, 0)
    
    const monthMinutes = activities
      .filter(a => a.date >= monthStart && a.status === 'COMPLETED')
      .reduce((sum, a) => sum + a.duration, 0)
    
    return { todayMinutes, weekMinutes, monthMinutes }
  }, [activities])
  
  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity)
    setShowForm(true)
  }
  
  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingActivity(null)
  }
  
  const handleFormCancel = () => {
    setShowForm(false)
    setEditingActivity(null)
  }
  
  return (
    <main className="container mx-auto p-6">
      <PageHeader
        title="Activities"
        description="Track and manage your practice sessions across all skills."
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus size={16} />
            Add Activity
          </Button>
        }
      />
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[hsl(var(--primary)_/_0.1)] rounded-[var(--radius)] text-[hsl(var(--primary))]">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Today</p>
                <p className="text-2xl font-bold">{formatDuration(stats.todayMinutes)}</p>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[hsl(var(--success)_/_0.1)] rounded-[var(--radius)] text-[hsl(var(--success))]">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">This Week</p>
                <p className="text-2xl font-bold">{formatDuration(stats.weekMinutes)}</p>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[hsl(var(--warning)_/_0.1)] rounded-[var(--radius)] text-[hsl(var(--warning))]">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">This Month</p>
                <p className="text-2xl font-bold">{formatDuration(stats.monthMinutes)}</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
      
      {/* Activity Form */}
      {showForm && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingActivity ? 'Edit Activity' : 'Add New Activity'}
            </h2>
            <ActivityForm
              activity={editingActivity || undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </CardContent>
        </Card>
      )}
      
      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Filter size={20} />
              Filters & Sort
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide' : 'Show'}
            </Button>
          </div>
          
          {showFilters && (
            <div className="space-y-4">
              {/* Skill Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Filter by Skill
                </label>
                <select
                  value={filterSkillId}
                  onChange={(e) => setFilterSkillId(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                >
                  <option value="">All Skills</option>
                  {skills.map(skill => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
                  <button
                    onClick={() => setDateFilter('all')}
                    className={`px-3 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors ${
                      dateFilter === 'all'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/80'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    onClick={() => setDateFilter('today')}
                    className={`px-3 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors ${
                      dateFilter === 'today'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/80'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setDateFilter('week')}
                    className={`px-3 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors ${
                      dateFilter === 'week'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/80'
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setDateFilter('month')}
                    className={`px-3 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors ${
                      dateFilter === 'month'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/80'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => setDateFilter('year')}
                    className={`px-3 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors ${
                      dateFilter === 'year'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/80'
                    }`}
                  >
                    This Year
                  </button>
                  <button
                    onClick={() => setDateFilter('custom')}
                    className={`px-3 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors ${
                      dateFilter === 'custom'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/80'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                
                {dateFilter === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <ArrowUpDown size={16} />
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                >
                  <option value="date-desc">Date (Newest First)</option>
                  <option value="date-asc">Date (Oldest First)</option>
                  <option value="duration-desc">Duration (Longest First)</option>
                  <option value="duration-asc">Duration (Shortest First)</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Activity List */}
      <ActivityList
        skillId={filterSkillId || undefined}
        dateRange={getDateRange()}
        sortBy={sortBy}
        onEdit={handleEdit}
      />
    </main>
  )
}
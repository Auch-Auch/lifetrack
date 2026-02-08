'use client'
import React, { useState, useMemo } from 'react'
import { useActivityStore } from '@/stores/activityStore'
import { getSkills } from '@/lib/skills'
import { formatDuration, getTodayDate } from '@/lib/activities'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import ActivityList from '@/components/ActivityList'
import ActivityForm from '@/components/ActivityForm'
import { Plus, Clock, Calendar, TrendingUp } from 'lucide-react'
import type { Activity } from '@/lib/activities'

export default function ActivitiesPage() {
  const { listActivities } = useActivityStore()
  const skills = getSkills()
  const [showForm, setShowForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [filterSkillId, setFilterSkillId] = useState<string>('')
  
  const allActivities = listActivities()
  
  // Calculate stats
  const stats = useMemo(() => {
    const today = getTodayDate()
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const weekStart = startOfWeek.toISOString().split('T')[0]
    
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    const monthStart = startOfMonth.toISOString().split('T')[0]
    
    const todayMinutes = allActivities
      .filter(a => a.date === today && a.status === 'completed')
      .reduce((sum, a) => sum + a.duration, 0)
    
    const weekMinutes = allActivities
      .filter(a => a.date >= weekStart && a.status === 'completed')
      .reduce((sum, a) => sum + a.duration, 0)
    
    const monthMinutes = allActivities
      .filter(a => a.date >= monthStart && a.status === 'completed')
      .reduce((sum, a) => sum + a.duration, 0)
    
    return { todayMinutes, weekMinutes, monthMinutes }
  }, [allActivities])
  
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
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Filter by Skill
        </label>
        <select
          value={filterSkillId}
          onChange={(e) => setFilterSkillId(e.target.value)}
          className="px-3 py-2 rounded-[var(--radius)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
        >
          <option value="">All Skills</option>
          {skills.map(skill => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Activity List */}
      <ActivityList 
        skillId={filterSkillId || undefined}
        onEdit={handleEdit}
      />
    </main>
  )
}
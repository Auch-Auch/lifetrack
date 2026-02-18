'use client'

import { useState } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ActivityHeatmap365 from '@/components/ActivityHeatmap365'
import { BookOpen, Activity as ActivityIcon, Target, Clock, FileText } from 'lucide-react'
import { Activity } from '@/lib/activities'
import { Skill } from '@/lib/skills'

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([])
  const [skills, setSkills] = useState<Map<string, Skill>>(new Map())

  const handleDaySelect = async (date: string, activities: Activity[]) => {
    setSelectedDate(date)
    setSelectedActivities(activities)
    
    // Load skills for activities if not already loaded
    const skillIds = activities.map(a => a.skillId).filter(id => !skills.has(id))
    if (skillIds.length > 0) {
      const { getSkills } = await import('@/lib/skills')
      try {
        const allSkills = await getSkills()
        const skillMap = new Map(skills)
        allSkills.forEach(skill => skillMap.set(skill.id, skill))
        setSkills(skillMap)
      } catch (error) {
        console.error('Failed to load skills:', error)
      }
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <main className="container mx-auto p-4 sm:p-6">
      <PageHeader
        title="Welcome to LifeTrack"
        description="Your personal hub for tracking self-development and learning activities."
      />

      {/* Activity Heatmap */}
      <div className="mb-8">
        <ActivityHeatmap365 onDaySelect={handleDaySelect} />
      </div>

      {/* Selected Day Activities */}
      {selectedDate && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold">{formatDate(selectedDate)}</h3>
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
                    {selectedActivities.length} {selectedActivities.length === 1 ? 'session' : 'sessions'}
                    {selectedActivities.length > 0 && (
                      <> · {formatDuration(selectedActivities.reduce((sum, a) => sum + a.duration, 0))}</>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                  className="self-start sm:self-center"
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedActivities.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                  <ActivityIcon className="mx-auto mb-3 opacity-50" size={32} />
                  <p>No activities on this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedActivities.map((activity) => {
                    const skill = skills.get(activity.skillId)
                    return (
                      <div
                        key={activity.id}
                        className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-[hsl(var(--muted))]/30 rounded-[var(--radius)] border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-colors"
                      >
                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-green-500 hidden sm:block" />
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{activity.name}</h4>
                            {skill && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                                {skill.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDuration(activity.duration)}
                            </span>
                            {activity.notes && (
                              <span className="flex items-center gap-1">
                                <FileText size={12} />
                                Notes
                              </span>
                            )}
                          </div>
                          {activity.notes && (
                            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] line-clamp-2">
                              {activity.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-xs text-[hsl(var(--muted-foreground))] sm:ml-0 sm:self-start">
                          {new Date(activity.createdAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-6 sm:mb-8">
        <Card hoverable>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[hsl(var(--primary)_/_0.1)] rounded-[var(--radius)] text-[hsl(var(--primary))]">
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Skills</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Track your learning</p>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        <Card hoverable>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[hsl(var(--success)_/_0.1)] rounded-[var(--radius)] text-[hsl(var(--success))]">
                <ActivityIcon size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Activities</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Log practice sessions</p>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        <Card hoverable>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[hsl(var(--warning)_/_0.1)] rounded-[var(--radius)] text-[hsl(var(--warning))]">
                <Target size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Progress</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Visualize your growth</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
      
      <Card>
        <CardContent className="py-6 sm:py-8 text-center px-4">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">Ready to start tracking?</h2>
          <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] mb-4 sm:mb-6 max-w-2xl mx-auto">
            Explore your skills, log practice sessions with our timer, and watch your progress grow over time.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <Link href="/skill-map" className="w-full sm:w-auto">
              <Button size="lg" className="w-full">View Skills</Button>
            </Link>
            <Link href="/activities" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full">Browse Activities</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

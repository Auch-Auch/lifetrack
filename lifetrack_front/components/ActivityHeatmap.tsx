'use client'
import React, { useMemo } from 'react'
import { useActivityStore } from '@/stores/activityStore'
import { formatDuration } from '@/lib/activities'
import Button from './ui/Button'
import { Plus } from 'lucide-react'

type Props = {
  skillId: string
  onAddActivity?: () => void
}

export default function ActivityHeatmap({ skillId, onAddActivity }: Props) {
  const allActivities = useActivityStore(state => state.activities)
  
  const activities = useMemo(() => {
    return allActivities
      .filter(a => a.status === 'COMPLETED' && a.skillId === skillId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [allActivities, skillId])
  
  const DAYS = 120
  
  // Prepare activity data by date
  const activityByDate = useMemo(() => {
    const map = new Map<string, { totalMinutes: number; activities: typeof activities }>()
    
    activities.forEach(activity => {
      const existing = map.get(activity.date) || { totalMinutes: 0, activities: [] }
      map.set(activity.date, {
        totalMinutes: existing.totalMinutes + activity.duration,
        activities: [...existing.activities, activity]
      })
    })
    
    return map
  }, [activities])
  
  // Generate last N days
  const days = useMemo(() => {
    const arr: { date: string; totalMinutes: number; activities: typeof activities }[] = []
    
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().split('T')[0]
      const data = activityByDate.get(iso) || { totalMinutes: 0, activities: [] }
      arr.push({ date: iso, ...data })
    }
    
    return arr
  }, [activityByDate])
  
  // Layout into weeks (columns of 7 days each)
  const weeks = useMemo(() => {
    const cols: typeof days[] = []
    for (let i = 0; i < days.length; i += 7) {
      cols.push(days.slice(i, i + 7))
    }
    return cols
  }, [days])
  
  // Get color based on minutes
  const getColor = (minutes: number): string => {
    if (minutes === 0) return 'bg-[hsl(var(--muted))]'
    if (minutes <= 30) return 'bg-[hsl(var(--success-light))]'
    if (minutes <= 60) return 'bg-[hsl(var(--success-medium))]'
    return 'bg-[hsl(var(--success))]'
  }
  
  // Week day labels
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Activity Heatmap</h3>
        {onAddActivity && (
          <Button variant="ghost" size="sm" onClick={onAddActivity}>
            <Plus size={16} />
            Add Activity
          </Button>
        )}
      </div>
      
      <div className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
        Last {DAYS} days · Hover to see details
      </div>
      
      <div className="overflow-auto pb-2">
        <div className="flex gap-1 items-start">
          {/* Week day labels column */}
          <div className="flex flex-col gap-1 mr-2">
            {weekDays.map((day, i) => (
              <div
                key={i}
                className="w-5 h-5 flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]"
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Activity cells */}
          {weeks.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map(day => {
                const { totalMinutes, activities: dayActivities } = day
                const color = getColor(totalMinutes)
                
                const tooltipText = totalMinutes > 0
                  ? `${day.date}\n${formatDuration(totalMinutes)} total\n${dayActivities.map(a => `• ${a.name} (${formatDuration(a.duration)})`).join('\n')}`
                  : day.date
                
                return (
                  <div
                    key={day.date}
                    title={tooltipText}
                    className={`
                      w-5 h-5 ${color} 
                      rounded-sm 
                      border border-[hsl(var(--border))]
                      transition-all duration-[var(--transition-fast)]
                      hover:ring-2 hover:ring-[hsl(var(--primary))] hover:scale-110
                      cursor-pointer
                    `}
                    aria-label={tooltipText}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-[hsl(var(--muted))] rounded-sm border border-[hsl(var(--border))]" />
          <div className="w-4 h-4 bg-[hsl(var(--success-light))] rounded-sm border border-[hsl(var(--border))]" />
          <div className="w-4 h-4 bg-[hsl(var(--success-medium))] rounded-sm border border-[hsl(var(--border))]" />
          <div className="w-4 h-4 bg-[hsl(var(--success))] rounded-sm border border-[hsl(var(--border))]" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
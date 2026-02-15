'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { getActivities, type Activity } from '@/lib/activities'
import { Card, CardContent, CardHeader } from './ui/Card'
import Button from './ui/Button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type DayData = {
  date: string
  count: number
  totalMinutes: number
}

type ActivityHeatmap365Props = {
  onDaySelect?: (date: string, activities: Activity[]) => void
}

export default function ActivityHeatmap365({ onDaySelect }: ActivityHeatmap365Props = {}) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true)
      try {
        const startDate = `${year}-01-01`
        const endDate = `${year}-12-31`
        const result = await getActivities({ startDate, endDate, status: 'COMPLETED' })
        setActivities(result.nodes)
      } catch (error) {
        console.error('Failed to load activities:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchActivities()
  }, [year])

  // Set default to today's date
  useEffect(() => {
    if (!loading && activities.length > 0 && !selectedDay) {
      const today = new Date().toISOString().split('T')[0]
      const todayActivities = activities.filter(a => a.date === today)
      const totalMinutes = todayActivities.reduce((sum, a) => sum + a.duration, 0)
      setSelectedDay({
        date: today,
        count: todayActivities.length,
        totalMinutes
      })
    }
  }, [loading, activities, selectedDay])

  // Group activities by date - memoized to prevent re-renders
  const activityByDate = useMemo(() => {
    const map = new Map<string, { count: number; totalMinutes: number }>()
    activities.forEach((activity) => {
      const existing = map.get(activity.date) || { count: 0, totalMinutes: 0 }
      map.set(activity.date, {
        count: existing.count + 1,
        totalMinutes: existing.totalMinutes + activity.duration
      })
    })
    return map
  }, [activities])

  // Generate all days for the year
  const yearDays = useMemo(() => {
    const days: DayData[] = []
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const data = activityByDate.get(dateStr)
      days.push({
        date: dateStr,
        count: data?.count || 0,
        totalMinutes: data?.totalMinutes || 0
      })
    }
    return days
  }, [year, activityByDate])

  // Organize days into weeks (starting Sunday)
  const weeks = useMemo(() => {
    const weeksArray: DayData[][] = []
    let currentWeek: DayData[] = []
    
    // Add empty cells for days before the year starts
    const firstDay = new Date(year, 0, 1)
    const firstDayOfWeek = firstDay.getDay()
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0, totalMinutes: 0 })
    }
    
    yearDays.forEach((day) => {
      currentWeek.push(day)
      
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek)
        currentWeek = []
      }
    })
    
    // Add remaining days
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0, totalMinutes: 0 })
      }
      weeksArray.push(currentWeek)
    }
    
    return weeksArray
  }, [yearDays, year])

  const getIntensityColor = useCallback((minutes: number) => {
    if (minutes === 0) return 'bg-[hsl(var(--muted))]'
    if (minutes < 30) return 'bg-green-200 dark:bg-green-900'
    if (minutes < 60) return 'bg-green-300 dark:bg-green-800'
    if (minutes < 120) return 'bg-green-400 dark:bg-green-700'
    if (minutes < 180) return 'bg-green-500 dark:bg-green-600'
    return 'bg-green-600 dark:bg-green-500'
  }, [])

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }, [])

  const formatDuration = useCallback((minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }, [])

  const handleDayClick = useCallback((day: DayData) => {
    if (day.date) {
      setSelectedDay(day)
      // Call the callback with activities for this day
      if (onDaySelect) {
        const dayActivities = activities.filter(a => a.date === day.date)
        onDaySelect(day.date, dayActivities)
      }
    }
  }, [activities, onDaySelect])

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const totalActivities = activities.length
  const totalMinutes = activities.reduce((sum, a) => sum + a.duration, 0)
  const currentYear = new Date().getFullYear()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Activity Contribution</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {totalActivities} sessions · {formatDuration(totalMinutes)} total in {year}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setYear(year - 1)}
              disabled={loading}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="font-semibold min-w-[60px] text-center">{year}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setYear(year + 1)}
              disabled={year >= currentYear || loading}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
          </div>
        ) : (
          <>
            {/* Selected Day Info - Always Visible */}
            <div className="mb-4 p-3 bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))] rounded-[var(--radius)]">
              {selectedDay && selectedDay.date ? (
                <div>
                  <div className="font-semibold text-sm mb-1">{formatDate(selectedDay.date)}</div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">
                    {selectedDay.count > 0 ? (
                      <>
                        {selectedDay.count} {selectedDay.count === 1 ? 'session' : 'sessions'}
                        {' · '}
                        {formatDuration(selectedDay.totalMinutes)}
                      </>
                    ) : (
                      'No activity on this day'
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  Click on a day to see activity details
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex">
                  {/* Empty space for day labels */}
                  <div className="w-8" />
                  
                  {/* Month labels container */}
                  <div className="relative mb-2 h-4">
                    {monthLabels.map((month, idx) => {
                      // Find the first week that contains the first day of this month
                      const firstDayOfMonth = new Date(year, idx, 1)
                      const monthStartIndex = yearDays.findIndex(d => {
                        if (!d.date) return false
                        const dayDate = new Date(d.date)
                        return dayDate.getMonth() === idx && dayDate.getDate() === 1
                      })
                      
                      if (monthStartIndex === -1) return null
                      
                      // Calculate which week this falls into
                      const firstDayOfYear = new Date(year, 0, 1)
                      const daysOffset = firstDayOfYear.getDay()
                      const weekIndex = Math.floor((monthStartIndex + daysOffset) / 7)
                      
                      return (
                        <div
                          key={month}
                          className="absolute text-xs text-[hsl(var(--muted-foreground))]"
                          style={{ 
                            left: `${weekIndex * 13}px`
                          }}
                        >
                          {month}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-[2px]">
                  {/* Day labels */}
                  <div className="flex flex-col gap-[2px] mr-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <div className="h-[11px] leading-[11px]" />
                    <div className="h-[11px] leading-[11px]">Mon</div>
                    <div className="h-[11px] leading-[11px]" />
                    <div className="h-[11px] leading-[11px]">Wed</div>
                    <div className="h-[11px] leading-[11px]" />
                    <div className="h-[11px] leading-[11px]">Fri</div>
                    <div className="h-[11px] leading-[11px]" />
                  </div>

                  {/* Heatmap grid */}
                  <div className="flex gap-[2px]">
                    {weeks.map((week, weekIdx) => (
                      <div key={weekIdx} className="flex flex-col gap-[2px]">
                        {week.map((day, dayIdx) => (
                          <button
                            key={`${weekIdx}-${dayIdx}`}
                            type="button"
                            disabled={!day.date}
                            className={`w-[11px] h-[11px] rounded-sm transition-all ${
                              day.date 
                                ? `cursor-pointer hover:ring-2 hover:ring-[hsl(var(--primary))] ${getIntensityColor(day.totalMinutes)} ${
                                    selectedDay?.date === day.date ? 'ring-2 ring-[hsl(var(--primary))]' : ''
                                  }`
                                : 'bg-transparent cursor-default'
                            }`}
                            onClick={() => handleDayClick(day)}
                            title={day.date ? `${formatDate(day.date)}: ${day.count} sessions, ${formatDuration(day.totalMinutes)}` : ''}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 mt-4 text-xs text-[hsl(var(--muted-foreground))]">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-[11px] h-[11px] rounded-sm bg-[hsl(var(--muted))]" />
                    <div className="w-[11px] h-[11px] rounded-sm bg-green-200 dark:bg-green-900" />
                    <div className="w-[11px] h-[11px] rounded-sm bg-green-300 dark:bg-green-800" />
                    <div className="w-[11px] h-[11px] rounded-sm bg-green-400 dark:bg-green-700" />
                    <div className="w-[11px] h-[11px] rounded-sm bg-green-500 dark:bg-green-600" />
                    <div className="w-[11px] h-[11px] rounded-sm bg-green-600 dark:bg-green-500" />
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

'use client'
import { useState, useEffect, useMemo } from 'react'
import { getActivityStats, type ActivityStats, type SkillStats } from '@/lib/activities'
import PageHeader from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Calendar, Clock, TrendingUp, Award, BarChart3 } from 'lucide-react'
import { useToast } from '@/stores/toastStore'

type Period = 'today' | 'week' | 'month' | 'year' | 'all'

const periodLabels: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  all: 'All Time'
}

export default function StatisticsPage() {
  const [period, setPeriod] = useState<Period>('week')
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const dateRange = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let startDate: Date
    let endDate = new Date(today)
    endDate.setHours(23, 59, 59, 999)

    switch (period) {
      case 'today':
        startDate = new Date(today)
        break
      case 'week':
        startDate = new Date(today)
        startDate.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
        break
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1)
        break
      case 'all':
        startDate = new Date('2020-01-01') // Far back date
        endDate = new Date(now)
        endDate.setHours(23, 59, 59, 999)
        break
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }, [period])

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const data = await getActivityStats(dateRange.startDate, dateRange.endDate)
        setStats(data)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.startDate, dateRange.endDate])

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    return `${hours.toFixed(1)}h`
  }

  const getPercentage = (skillMinutes: number) => {
    if (!stats || stats.totalMinutes === 0) return 0
    return (skillMinutes / stats.totalMinutes * 100).toFixed(1)
  }

  // Sort skills by total time
  const sortedSkills = useMemo(() => {
    if (!stats) return []
    return [...stats.skillBreakdown].sort((a, b) => b.totalMinutes - a.totalMinutes)
  }, [stats])

  return (
    <main className="container mx-auto p-6">
      <PageHeader
        title="Statistics"
        description="Analyze your practice time and progress across all skills."
      />

      {/* Period Selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(periodLabels) as Period[]).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {periodLabels[p]}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
          <p className="mt-4 text-[hsl(var(--muted-foreground))]">Loading statistics...</p>
        </div>
      ) : !stats || stats.totalActivities === 0 ? (
        <Card className="p-12 text-center">
          <BarChart3 className="mx-auto mb-4 text-[hsl(var(--muted-foreground))]" size={48} />
          <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
          <p className="text-[hsl(var(--muted-foreground))]">
            Complete some activities to see your statistics for {periodLabels[period].toLowerCase()}.
          </p>
        </Card>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[hsl(var(--primary)_/_0.1)] rounded-[var(--radius)] text-[hsl(var(--primary))]">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Total Time</p>
                    <p className="text-2xl font-bold">{formatHours(stats.totalHours)}</p>
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
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Sessions</p>
                    <p className="text-2xl font-bold">{stats.totalActivities}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[hsl(var(--warning)_/_0.1)] rounded-[var(--radius)] text-[hsl(var(--warning))]">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Skills Practiced</p>
                    <p className="text-2xl font-bold">{stats.skillBreakdown.length}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[hsl(var(--info)_/_0.1)] rounded-[var(--radius)] text-[hsl(var(--info))]">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Avg / Session</p>
                    <p className="text-2xl font-bold">
                      {formatHours(stats.totalHours / stats.totalActivities)}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Skills Breakdown */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Time by Skill</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Breakdown of practice time across all skills
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedSkills.map((skill) => (
                  <div key={skill.skillId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />
                        <span className="font-medium">{skill.skillName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-[hsl(var(--muted-foreground))]">
                          {skill.activityCount} {skill.activityCount === 1 ? 'session' : 'sessions'}
                        </span>
                        <span className="font-semibold min-w-[60px] text-right">
                          {formatHours(skill.totalHours)}
                        </span>
                        <span className="text-[hsl(var(--muted-foreground))] min-w-[50px] text-right">
                          {getPercentage(skill.totalMinutes)}%
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary)_/_0.7)] rounded-full transition-all duration-300"
                        style={{ width: `${getPercentage(skill.totalMinutes)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Skills Table */}
          <Card className="mt-6">
            <CardHeader>
              <h2 className="text-xl font-semibold">Detailed Breakdown</h2>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))]">
                      <th className="text-left py-3 px-4 font-semibold">Skill</th>
                      <th className="text-right py-3 px-4 font-semibold">Sessions</th>
                      <th className="text-right py-3 px-4 font-semibold">Total Time</th>
                      <th className="text-right py-3 px-4 font-semibold">Average</th>
                      <th className="text-right py-3 px-4 font-semibold">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSkills.map((skill, index) => (
                      <tr
                        key={skill.skillId}
                        className={`border-b border-[hsl(var(--border))] ${
                          index % 2 === 0 ? 'bg-[hsl(var(--muted)_/_0.3)]' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-medium">{skill.skillName}</td>
                        <td className="py-3 px-4 text-right">{skill.activityCount}</td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatHours(skill.totalHours)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatHours(skill.totalHours / skill.activityCount)}
                        </td>
                        <td className="py-3 px-4 text-right text-[hsl(var(--muted-foreground))]">
                          {getPercentage(skill.totalMinutes)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[hsl(var(--border))] font-semibold">
                      <td className="py-3 px-4">Total</td>
                      <td className="py-3 px-4 text-right">{stats.totalActivities}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatHours(stats.totalHours)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatHours(stats.totalHours / stats.totalActivities)}
                      </td>
                      <td className="py-3 px-4 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}

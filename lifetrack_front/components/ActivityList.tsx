'use client'
import React, { useState, useEffect } from 'react'
import { useActivityStore } from '@/stores/activityStore'
import { useToast } from '@/stores/toastStore'
import type { Activity } from '@/lib/activities'
import type { Skill } from '@/lib/skills'
import { formatDuration } from '@/lib/activities'
import { getSkillById } from '@/lib/skills'
import { Card } from './ui/Card'
import Badge from './ui/Badge'
import Button from './ui/Button'
import EmptyState from './ui/EmptyState'
import Pagination from './ui/Pagination'
import { Edit2, Trash2, Calendar, Clock, FileText } from 'lucide-react'

type Props = {
  skillId?: string
  pageSize?: number
  onEdit?: (activity: Activity) => void
}

export default function ActivityList({ skillId, pageSize = 10, onEdit }: Props) {
  const activities = useActivityStore((state) => state.activities)
  const deleteActivity = useActivityStore((state) => state.deleteActivity)
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [skills, setSkills] = useState<Map<string, Skill>>(new Map())
  
  // Filter and sort activities
  const filteredActivities = React.useMemo(() => {
    return activities
      .filter(a => a.status === 'COMPLETED')
      .filter(a => !skillId || a.skillId === skillId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [activities, skillId])
  
  // Load skills for all activities
  useEffect(() => {
    const uniqueSkillIds = [...new Set(filteredActivities.map(a => a.skillId))]
    Promise.all(uniqueSkillIds.map(id => getSkillById(id).then(skill => ({ id, skill }))))
      .then(results => {
        const skillMap = new Map()
        results.forEach(({ id, skill }) => {
          if (skill) skillMap.set(id, skill)
        })
        setSkills(skillMap)
      })
  }, [filteredActivities.length])
  
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize))
  
  const displayActivities = filteredActivities.slice((page - 1) * pageSize, page * pageSize)
  
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this activity?')) {
      deleteActivity(id)
      toast.success('Activity deleted')
    }
  }
  
  if (filteredActivities.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={48} />}
        title="No activities yet"
        description="Start a practice session or manually add an activity to see it here."
      />
    )
  }
  
  return (
    <div className="space-y-4">
      {displayActivities.map(activity => {
        const skill = skills.get(activity.skillId)
        const isExpanded = expandedId === activity.id
        
        return (
          <Card key={activity.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-[hsl(var(--foreground))] truncate">
                    {activity.name}
                  </h3>
                  {skill && (
                    <Badge variant="default" className="flex-shrink-0">
                      {skill.name}
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(activity.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatDuration(activity.duration)}
                  </div>
                </div>
                
                {activity.notes && (
                  <div className="mt-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                      className="flex items-center gap-1 text-sm text-[hsl(var(--primary))] hover:underline"
                    >
                      <FileText size={14} />
                      {isExpanded ? 'Hide' : 'Show'} notes
                    </button>
                    
                    {isExpanded && (
                      <p className="mt-2 text-sm text-[hsl(var(--foreground))] bg-[hsl(var(--muted)_/_0.5)] p-3 rounded-[var(--radius)]">
                        {activity.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(activity)}
                    aria-label="Edit activity"
                  >
                    <Edit2 size={16} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(activity.id)}
                  aria-label="Delete activity"
                  className="hover:text-[hsl(var(--danger))]"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
      
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
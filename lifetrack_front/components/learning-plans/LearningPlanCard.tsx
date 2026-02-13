/**
 * LearningPlanCard Component
 * 
 * Displays a learning plan with progress tracking and actions
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { LearningPlan } from '../../lib/events';
import type { Skill } from '../../lib/skills';
import { calculatePlanProgress } from '../../lib/events';
import { useLearningPlanStore } from '../../stores/learningPlanStore';
import { getSkills } from '../../lib/skills';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import {
  Calendar,
  Clock,
  Target,
  Edit,
  Trash2,
  Zap,
  TrendingUp,
  Play,
} from 'lucide-react';

// ============================================================================
// Component Props
// ============================================================================

interface LearningPlanCardProps {
  plan: LearningPlan;
  onEdit?: (plan: LearningPlan) => void;
  onDelete?: (planId: string) => void;
  compact?: boolean;
}

// ============================================================================
// LearningPlanCard Component
// ============================================================================

export default function LearningPlanCard({
  plan,
  onEdit,
  onDelete,
  compact = false,
}: LearningPlanCardProps) {
  const deletePlan = useLearningPlanStore((state) => state.deletePlan);
  const generateSchedule = useLearningPlanStore((state) => state.generateSchedule);
  
  const [skills, setSkills] = useState<Skill[]>([]);
  
  // Load skills
  useEffect(() => {
    getSkills().then(setSkills);
  }, []);
  
  const planSkills = skills.filter((s) => plan.skillIds.includes(s.id));
  const progress = calculatePlanProgress(plan);
  
  // Check if plan is active
  const today = new Date().toISOString().split('T')[0];
  const isActive = plan.startDate <= today && (!plan.endDate || plan.endDate >= today);
  const isUpcoming = plan.startDate > today;
  const isCompleted = plan.endDate && plan.endDate < today;
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this learning plan? Associated calendar events will also be deleted.')) {
      if (onDelete) {
        onDelete(plan.id);
      } else {
        deletePlan(plan.id);
      }
    }
  };
  
  const handleResync = () => {
    if (confirm('This will regenerate all auto-scheduled events for this plan. Continue?')) {
      generateSchedule(plan.id);
    }
  };
  
  // Format frequency
  const frequencyLabel = {
    daily: 'Daily',
    weekly: 'Weekly',
    custom: 'Custom',
  }[plan.schedule.frequency];
  
  // Format days
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const preferredDaysText = plan.schedule.preferredDays
    .map((d) => dayNames[d])
    .join(', ');
  
  if (compact) {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer transition-colors"
        onClick={() => onEdit?.(plan)}
      >
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.6)] flex items-center justify-center text-white font-bold">
          {Math.round(progress.percentComplete)}%
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{plan.name}</h4>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {planSkills.length} skill{planSkills.length !== 1 ? 's' : ''} · {frequencyLabel}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              {isActive && <Badge variant="success">Active</Badge>}
              {isUpcoming && <Badge variant="info">Upcoming</Badge>}
              {isCompleted && <Badge variant="default">Completed</Badge>}
              {plan.schedule.autoSchedule && (
                <Badge variant="warning">
                  <Zap className="w-3 h-3 mr-1" />
                  Auto
                </Badge>
              )}
            </div>
            
            {plan.description && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
                {plan.description}
              </p>
            )}
            
            {/* Skills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {planSkills.map((skill) => (
                <Badge key={skill.id} variant="info">
                  {skill.name}
                </Badge>
              ))}
            </div>
            
            {/* Progress Bar */}
            {plan.targetHoursPerWeek && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                    <TrendingUp className="w-4 h-4" />
                    Progress
                  </span>
                  <span className="font-medium">
                    {progress.completedHours.toFixed(1)}h / {progress.targetHours}h
                  </span>
                </div>
                <div className="h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--success))] transition-all duration-300"
                    style={{ width: `${Math.min(progress.percentComplete, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {progress.percentComplete}% complete
                </p>
              </div>
            )}
            
            {/* Schedule Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                <Calendar className="w-4 h-4" />
                <div>
                  <div className="font-medium">Schedule</div>
                  <div className="text-xs">{frequencyLabel} · {preferredDaysText}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                <Clock className="w-4 h-4" />
                <div>
                  <div className="font-medium">Duration</div>
                  <div className="text-xs">
                    {plan.schedule.durationMinutes} min at {plan.schedule.preferredTimes[0]}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                <Play className="w-4 h-4" />
                <div>
                  <div className="font-medium">Start Date</div>
                  <div className="text-xs">
                    {new Date(plan.startDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              {plan.endDate && (
                <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                  <Target className="w-4 h-4" />
                  <div>
                    <div className="font-medium">End Date</div>
                    <div className="text-xs">
                      {new Date(plan.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {plan.schedule.autoSchedule && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResync}
                aria-label="Re-sync schedule"
                title="Re-sync with calendar"
              >
                <Zap className="w-4 h-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(plan)}
                aria-label="Edit plan"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              aria-label="Delete plan"
            >
              <Trash2 className="w-4 h-4 text-[hsl(var(--danger))]" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

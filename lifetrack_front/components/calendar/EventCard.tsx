/**
 * EventCard Component
 * 
 * Displays a single event with all its details in a card format
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { Event } from '../../lib/events';
import type { Skill } from '../../lib/skills';
import { formatEventTime, formatEventDuration, getEventTypeColor } from '../../lib/events';
import { useEventStore } from '../../stores/eventStore';
import { getSkills } from '../../lib/skills';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import {
  Calendar,
  Clock,
  MapPin,
  Repeat,
  Bell,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ============================================================================
// Component Props
// ============================================================================

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  compact?: boolean;
}

// ============================================================================
// EventCard Component
// ============================================================================

export default function EventCard({
  event,
  onEdit,
  onDelete,
  compact = false,
}: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const deleteEvent = useEventStore((state) => state.deleteEvent);
  
  // Load skills
  useEffect(() => {
    getSkills().then(setSkills);
  }, []);
  
  const skill = skills.find((s) => s.id === event.skillId);
  const eventColor = event.color || getEventTypeColor(event.type);
  
  // Event type emoji
  const typeEmoji = {
    ACTIVITY: '🎯',
    LEARNING: '📚',
    MEETING: '👥',
    REMINDER: '⏰',
    CUSTOM: '📌',
  }[event.type];
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this event?')) {
      if (onDelete) {
        onDelete(event.id);
      } else {
        deleteEvent(event.id);
      }
    }
  };
  
  if (compact) {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer transition-colors"
        onClick={() => onEdit?.(event)}
      >
        <div
          className="w-1 h-12 rounded-full"
          style={{ backgroundColor: eventColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{typeEmoji}</span>
            <h4 className="font-medium truncate">{event.title}</h4>
          </div>
          <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatEventTime(event)}
            </span>
            <span>{formatEventDuration(event)}</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div
              className="w-1 h-full min-h-[40px] rounded-full"
              style={{ backgroundColor: eventColor }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{typeEmoji}</span>
                <h3 className="text-lg font-semibold">{event.title}</h3>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="default">{event.type}</Badge>
                {skill && <Badge variant="info">{skill.name}</Badge>}
                {event.allDay && <Badge variant="warning">All day</Badge>}
                {event.recurrence !== 'NONE' && (
                  <Badge variant="default">
                    <Repeat className="w-3 h-3 mr-1" />
                    Recurring
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(event.startTime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                  <Clock className="w-4 h-4" />
                  <span>{formatEventTime(event)}</span>
                  <span className="text-xs">({formatEventDuration(event)})</span>
                </div>
                
                {event.location && (
                  <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                )}
                
                {event.notifications?.enabled && (
                  <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                    <Bell className="w-4 h-4" />
                    <span>
                      {event.notifications.reminderMinutes[0] || 15} min before
                    </span>
                  </div>
                )}
              </div>
              
              {event.description && (
                <>
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 mt-3 text-sm text-[hsl(var(--primary))] hover:underline"
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide description
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show description
                      </>
                    )}
                  </button>
                  
                  {expanded && (
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">
                      {event.description}
                    </p>
                  )}
                </>
              )}
              
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs rounded-full bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--muted-foreground))]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(event)}
                aria-label="Edit event"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              aria-label="Delete event"
            >
              <Trash2 className="w-4 h-4 text-[hsl(var(--danger))]" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

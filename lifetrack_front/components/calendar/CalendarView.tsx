/**
 * CalendarView Component
 * 
 * Main calendar component using react-big-calendar
 * Supports Month, Week, and Day views with event management
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { Event as CalendarEvent } from 'react-big-calendar';
import type { Event } from '../../lib/events';
import { useEventStore } from '../../stores/eventStore';
import { getEventTypeColor } from '../../lib/events';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// ============================================================================
// date-fns Localizer Setup
// ============================================================================

const locales = {
  'en-US': enUS,
};

// Use the built-in dateFnsLocalizer for proper date-fns v4 compatibility
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// ============================================================================
// Component Props
// ============================================================================

interface CalendarViewProps {
  onSelectEvent?: (event: Event) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  defaultView?: 'month' | 'week' | 'day';
  defaultDate?: Date;
  showToolbar?: boolean;
}

// ============================================================================
// CalendarView Component
// ============================================================================

export default function CalendarView({
  onSelectEvent,
  onSelectSlot,
  defaultView = 'month',
  defaultDate = new Date(),
  showToolbar = true,
}: CalendarViewProps) {
  const [view, setView] = useState<View>(defaultView);
  const [date, setDate] = useState(defaultDate);
  
  const events = useEventStore((state) => state.events);
  
  // Convert our Event type to react-big-calendar Event type
  const calendarEvents = useMemo((): CalendarEvent[] => {
    return events.map((event) => ({
      title: event.title,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      resource: event, // Store full event data
      allDay: event.allDay,
    }));
  }, [events]);
  
  // Handle event selection
  const handleSelectEvent = useCallback(
    (calendarEvent: CalendarEvent) => {
      const event = calendarEvent.resource as Event;
      onSelectEvent?.(event);
    },
    [onSelectEvent]
  );
  
  // Handle time slot selection
  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date; action: string }) => {
      if (slotInfo.action === 'click' || slotInfo.action === 'select') {
        onSelectSlot?.(slotInfo);
      }
    },
    [onSelectSlot]
  );
  
  // Custom event style getter
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const fullEvent = event.resource as Event;
      const backgroundColor = fullEvent.color || getEventTypeColor(fullEvent.type);
      
      return {
        style: {
          backgroundColor,
          borderRadius: '4px',
          opacity: 0.9,
          color: 'white',
          border: 'none',
          display: 'block',
          fontSize: '0.875rem',
          padding: '2px 4px',
        },
      };
    },
    []
  );
  
  // Handle navigation
  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);
  
  // Handle view change
  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);
  
  return (
    <div className="calendar-wrapper" style={{ height: '700px' }}>
      <Calendar
        localizer={localizer as never}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        view={view}
        date={date}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        popup
        eventPropGetter={eventStyleGetter}
        showMultiDayTimes
        step={15}
        timeslots={4}
        toolbar={showToolbar}
        views={['month', 'week', 'day']}
        messages={{
          next: 'Next',
          previous: 'Previous',
          today: 'Today',
          month: 'Month',
          week: 'Week',
          day: 'Day',
          agenda: 'Agenda',
          date: 'Date',
          time: 'Time',
          event: 'Event',
          noEventsInRange: 'No events in this range',
          showMore: (total) => `+${total} more`,
        }}
      />
      
      <style jsx global>{`
        /* Calendar custom styles */
        .calendar-wrapper {
          background: hsl(var(--background));
          border-radius: var(--radius-lg);
          padding: var(--spacing-4);
          border: 1px solid hsl(var(--border));
        }
        
        .rbc-calendar {
          font-family: inherit;
        }
        
        .rbc-header {
          padding: var(--spacing-2);
          font-weight: 600;
          color: hsl(var(--foreground));
          border-bottom: 1px solid hsl(var(--border));
        }
        
        .rbc-today {
          background-color: hsl(var(--primary) / 0.1);
        }
        
        .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.3);
        }
        
        .rbc-event {
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .rbc-event:hover {
          transform: scale(1.02);
          opacity: 1 !important;
        }
        
        .rbc-event-label {
          font-size: 0.75rem;
        }
        
        .rbc-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-4);
          flex-wrap: wrap;
          gap: var(--spacing-2);
        }
        
        .rbc-toolbar button {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          padding: var(--spacing-2) var(--spacing-3);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }
        
        .rbc-toolbar button:hover {
          background: hsl(var(--muted));
        }
        
        .rbc-toolbar button.rbc-active {
          background: hsl(var(--primary));
          color: white;
          border-color: hsl(var(--primary));
        }
        
        .rbc-toolbar-label {
          font-size: 1.125rem;
          font-weight: 600;
          color: hsl(var(--foreground));
        }
        
        .rbc-month-view,
        .rbc-time-view {
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        
        .rbc-time-slot {
          border-top: 1px solid hsl(var(--border) / 0.3);
        }
        
        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid hsl(var(--border) / 0.2);
        }
        
        .rbc-time-header-content {
          border-left: 1px solid hsl(var(--border));
        }
        
        .rbc-current-time-indicator {
          background-color: hsl(var(--danger));
          height: 2px;
        }
        
        .rbc-agenda-view {
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius-md);
        }
        
        .rbc-agenda-table {
          border-collapse: collapse;
        }
        
        .rbc-agenda-date-cell,
        .rbc-agenda-time-cell,
        .rbc-agenda-event-cell {
          padding: var(--spacing-2);
          border-bottom: 1px solid hsl(var(--border));
        }
        
        .rbc-show-more {
          background-color: hsl(var(--primary));
          color: white;
          padding: 2px 4px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          cursor: pointer;
        }
        
        .rbc-overlay {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius-md);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          padding: var(--spacing-2);
        }
        
        .rbc-overlay-header {
          border-bottom: 1px solid hsl(var(--border));
          margin-bottom: var(--spacing-2);
          padding-bottom: var(--spacing-2);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

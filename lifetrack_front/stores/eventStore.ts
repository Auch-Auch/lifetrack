/**
 * Event Store
 * 
 * Global state management for calendar events with localStorage persistence
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
import type { Event, EventType } from '../lib/events';
import {
  generateId,
  getTodayDate,
  createDefaultNotifications,
  filterEventsByDateRange,
  sortEventsByTime,
  groupEventsByDate,
} from '../lib/events';
import { expandRecurrence } from '../lib/helpers/event';
import { useToastStore } from './toastStore';

// ============================================================================
// Store Interface
// ============================================================================

interface EventStore {
  // State
  events: Event[];
  initialized: boolean;
  
  // CRUD Operations
  createEvent: (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => Event;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  getEvent: (id: string) => Event | undefined;
  
  // Query Operations
  getEventsInRange: (startDate: string, endDate: string) => Event[];
  getEventsByType: (type: EventType) => Event[];
  getEventsBySkill: (skillId: string) => Event[];
  getUpcomingEvents: (limit?: number) => Event[];
  getTodayEvents: () => Event[];
  searchEvents: (query: string) => Event[];
  
  // Recurrence Operations
  expandRecurringEvents: (startDate: string, endDate: string) => Event[];
  
  // Bulk Operations
  bulkCreateEvents: (events: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>[]) => Event[];
  bulkDeleteEvents: (ids: string[]) => void;
  
  // Initialization
  initialize: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useEventStore = create<EventStore>()(
  persist(
    (set, get) => ({
      // Initial state
      events: [],
      initialized: false,
      
      // ========================================================================
      // CRUD Operations
      // ========================================================================
      
      createEvent: (eventData) => {
        const now = new Date().toISOString();
        const newEvent: Event = {
          ...eventData,
          id: generateId('event'),
          notifications: eventData.notifications || createDefaultNotifications(),
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          events: [...state.events, newEvent],
        }));
        
        useToastStore.getState().addToast('Event created successfully', 'success');
        return newEvent;
      },
      
      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id
              ? { ...event, ...updates, updatedAt: new Date().toISOString() }
              : event
          ),
        }));
        
        useToastStore.getState().addToast('Event updated successfully', 'success');
      },
      
      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        }));
        
        useToastStore.getState().addToast('Event deleted successfully', 'success');
      },
      
      getEvent: (id) => {
        return get().events.find((event) => event.id === id);
      },
      
      // ========================================================================
      // Query Operations
      // ========================================================================
      
      getEventsInRange: (startDate, endDate) => {
        const { events } = get();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return filterEventsByDateRange(events, start, end);
      },
      
      getEventsByType: (type) => {
        return get().events.filter((event) => event.type === type);
      },
      
      getEventsBySkill: (skillId) => {
        return get().events.filter((event) => event.skillId === skillId);
      },
      
      getUpcomingEvents: (limit = 5) => {
        const now = new Date();
        const { events } = get();
        
        const upcoming = events
          .filter((event) => new Date(event.startTime) > now)
          .sort((a, b) => 
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          )
          .slice(0, limit);
        
        return upcoming;
      },
      
      getTodayEvents: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return get().getEventsInRange(
          today.toISOString(),
          tomorrow.toISOString()
        );
      },
      
      searchEvents: (query) => {
        const { events } = get();
        const lowerQuery = query.toLowerCase();
        
        return events.filter(
          (event) =>
            event.title.toLowerCase().includes(lowerQuery) ||
            event.description?.toLowerCase().includes(lowerQuery) ||
            event.location?.toLowerCase().includes(lowerQuery) ||
            event.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
        );
      },
      
      // ========================================================================
      // Recurrence Operations
      // ========================================================================
      
      expandRecurringEvents: (startDate, endDate) => {
        const { events } = get();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const expandedEvents: Event[] = [];
        
        for (const event of events) {
          const instances = expandRecurrence(event, start, end);
          expandedEvents.push(...instances);
        }
        
        return sortEventsByTime(expandedEvents);
      },
      
      // ========================================================================
      // Bulk Operations
      // ========================================================================
      
      bulkCreateEvents: (eventsData) => {
        const now = new Date().toISOString();
        const newEvents: Event[] = eventsData.map((eventData) => ({
          ...eventData,
          id: generateId('event'),
          notifications: eventData.notifications || createDefaultNotifications(),
          createdAt: now,
          updatedAt: now,
        }));
        
        set((state) => ({
          events: [...state.events, ...newEvents],
        }));
        
        useToastStore.getState().addToast(`${newEvents.length} events created`, 'success');
        return newEvents;
      },
      
      bulkDeleteEvents: (ids) => {
        set((state) => ({
          events: state.events.filter((event) => !ids.includes(event.id)),
        }));
        
        useToastStore.getState().addToast(`${ids.length} events deleted`, 'success');
      },
      
      // ========================================================================
      // Initialization
      // ========================================================================
      
      initialize: () => {
        if (get().initialized) return;
        
        // Migration logic can go here (e.g., from activities to events)
        // For now, just mark as initialized
        
        set({ initialized: true });
      },
    }),
    {
      name: 'events_v1', // localStorage key
      partialize: (state) => ({
        events: state.events,
        // Don't persist initialized flag
      }),
    }
  )
);

// ============================================================================
// Selector Hooks (for performance optimization)
// ============================================================================

/**
 * Get events count
 */
export function useEventCount() {
  return useEventStore((state) => state.events.length);
}

/**
 * Get events for a specific date
 * 
 * Note: Results are memoized to prevent infinite loops
 */
export function useEventsForDate(date: Date) {
  const dateStr = useMemo(() => date.toISOString().split('T')[0], [date]);
  const events = useEventStore((state) => state.events);
  
  return useMemo(() => 
    events.filter((event) => event.startTime.startsWith(dateStr)),
    [events, dateStr]
  );
}

/**
 * Get events grouped by date
 * 
 * Note: Results are memoized to prevent infinite loops
 */
export function useGroupedEvents(startDate: string, endDate: string) {
  const getEventsInRange = useEventStore((state) => state.getEventsInRange);
  
  return useMemo(() => {
    const events = getEventsInRange(startDate, endDate);
    return groupEventsByDate(events);
  }, [getEventsInRange, startDate, endDate]);
}

/**
 * Check if there are any events for a skill
 */
export function useHasSkillEvents(skillId: string) {
  return useEventStore((state) => 
    state.events.some((event) => event.skillId === skillId)
  );
}

/**
 * Get event statistics
 * 
 * Note: Results are memoized to prevent infinite loops
 */
export function useEventStats() {
  const events = useEventStore((state) => state.events);
  
  return useMemo(() => {
    const today = getTodayDate();
    const now = new Date();
    
    const todayEvents = events.filter((event) => 
      event.startTime.startsWith(today)
    );
    
    const upcomingEvents = events.filter((event) => 
      new Date(event.startTime) > now
    );
    
    const byType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<EventType, number>);
    
    return {
      total: events.length,
      today: todayEvents.length,
      upcoming: upcomingEvents.length,
      byType,
    };
  }, [events]);
}

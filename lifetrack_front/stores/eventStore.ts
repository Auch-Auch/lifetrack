/**
 * Event Store with GraphQL Integration
 * 
 * Global state management for calendar events
 */

'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import type { Event, EventType, CreateEventInput, UpdateEventInput } from '../lib/events';
import {
  getEvents as apiGetEvents,
  getEventById as apiGetEventById,
  getUpcomingEvents as apiGetUpcomingEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
  groupEventsByDate,
  getTodayDate,
} from '../lib/events';
import { useToastStore } from './toastStore';

// ============================================================================
// Store Interface
// ============================================================================

interface EventStore {
  // State
  events: Event[];
  loading: boolean;
  error: string | null;
  
  // CRUD Operations
  fetchEvents: (startDate: string, endDate: string, type?: EventType) => Promise<void>;
  fetchUpcomingEvents: (limit?: number) => Promise<void>;
  createEvent: (eventData: CreateEventInput) => Promise<Event>;
  updateEvent: (id: string, updates: UpdateEventInput) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEvent: (id: string) => Event | undefined;
  
  // Query Operations (client-side filtering)
  getEventsInRange: (startDate: string, endDate: string) => Event[];
  getEventsByType: (type: EventType) => Event[];
  getEventsBySkill: (skillId: string) => Event[];
  getTodayEvents: () => Event[];
  searchEvents: (query: string) => Event[];
  
  // Bulk Operations
  bulkDeleteEvents: (ids: string[]) => Promise<void>;
  
  // Error handling
  clearError: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useEventStore = create<EventStore>()((set, get) => ({
  // Initial state
  events: [],
  loading: false,
  error: null,
  
  clearError: () => set({ error: null }),
  
  // ========================================================================
  // API Operations
  // ========================================================================
  
  fetchEvents: async (startDate, endDate, type) => {
    try {
      set({ loading: true, error: null });
      const events = await apiGetEvents(startDate, endDate, type);
      set({ events, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        loading: false
      });
    }
  },
  
  fetchUpcomingEvents: async (limit) => {
    try {
      set({ loading: true, error: null });
      const events = await apiGetUpcomingEvents(limit);
      set({ events, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch upcoming events',
        loading: false
      });
    }
  },
  
  createEvent: async (eventData) => {
    try {
      set({ loading: true, error: null });
      const newEvent = await apiCreateEvent(eventData);
      set(state => ({
        events: [...state.events, newEvent],
        loading: false
      }));
      useToastStore.getState().addToast('Event created successfully', 'success');
      return newEvent;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create event',
        loading: false
      });
      useToastStore.getState().addToast('Failed to create event', 'error');
      throw error;
    }
  },
  
  updateEvent: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      const updated = await apiUpdateEvent(id, updates);
      set(state => ({
        events: state.events.map(event => event.id === id ? updated : event),
        loading: false
      }));
      useToastStore.getState().addToast('Event updated successfully', 'success');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update event',
        loading: false
      });
      useToastStore.getState().addToast('Failed to update event', 'error');
      throw error;
    }
  },
  
  deleteEvent: async (id) => {
    try {
      set({ loading: true, error: null });
      await apiDeleteEvent(id);
      set(state => ({
        events: state.events.filter(event => event.id !== id),
        loading: false
      }));
      useToastStore.getState().addToast('Event deleted successfully', 'success');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete event',
        loading: false
      });
      useToastStore.getState().addToast('Failed to delete event', 'error');
      throw error;
    }
  },
  
  getEvent: (id) => {
    return get().events.find(event => event.id === id);
  },
  
  // ========================================================================
  // Client-side Query Operations
  // ========================================================================
  
  getEventsInRange: (startDate, endDate) => {
    const { events } = get();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    return events.filter(event => {
      const eventStart = new Date(event.startTime).getTime();
      return eventStart >= start && eventStart <= end;
    }).sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  },
  
  getEventsByType: (type) => {
    return get().events.filter(event => event.type === type);
  },
  
  getEventsBySkill: (skillId) => {
    return get().events.filter(event => event.skillId === skillId);
  },
  
  getTodayEvents: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return get().events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate >= today && eventDate < tomorrow;
    }).sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  },
  
  searchEvents: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().events.filter(event =>
      event.title.toLowerCase().includes(lowerQuery) ||
      event.description?.toLowerCase().includes(lowerQuery) ||
      event.location?.toLowerCase().includes(lowerQuery)
    );
  },
  
  bulkDeleteEvents: async (ids) => {
    try {
      set({ loading: true, error: null });
      await Promise.all(ids.map(id => apiDeleteEvent(id)));
      set(state => ({
        events: state.events.filter(event => !ids.includes(event.id)),
        loading: false
      }));
      useToastStore.getState().addToast(`${ids.length} events deleted`, 'success');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Bulk delete failed',
        loading: false
      });
      useToastStore.getState().addToast('Failed to delete events', 'error');
      throw error;
    }
  },
}));

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

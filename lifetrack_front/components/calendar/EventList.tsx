/**
 * EventList Component
 * 
 * Displays a paginated list of events with filtering and search
 */

'use client';

import React, { useState, useMemo } from 'react';
import type { Event, EventType } from '../../lib/events';
import { useEventStore } from '../../stores/eventStore';
import { sortEventsByTime, groupEventsByDate } from '../../lib/events';
import EventCard from './EventCard';
import EmptyState from '../ui/EmptyState';
import Pagination from '../ui/Pagination';
import { Calendar, Search } from 'lucide-react';

// ============================================================================
// Component Props
// ============================================================================

interface EventListProps {
  events?: Event[]; // If not provided, uses all events from store
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  showFilters?: boolean;
  itemsPerPage?: number;
  compact?: boolean;
  groupByDate?: boolean;
}

// ============================================================================
// EventList Component
// ============================================================================

export default function EventList({
  events: externalEvents,
  onEdit,
  onDelete,
  showFilters = true,
  itemsPerPage = 10,
  compact = false,
  groupByDate = false,
}: EventListProps) {
  const storeEvents = useEventStore((state) => state.events);
  const events = externalEvents || storeEvents;
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [filterUpcoming, setFilterUpcoming] = useState(false);
  
  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let result = [...events];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query)
      );
    }
    
    // Type filter
    if (filterType !== 'all') {
      result = result.filter((event) => event.type === filterType);
    }
    
    // Upcoming filter
    if (filterUpcoming) {
      const now = new Date();
      result = result.filter((event) => new Date(event.startTime) > now);
    }
    
    // Sort by start time (newest first for past, oldest first for future)
    return sortEventsByTime(result);
  }, [events, searchQuery, filterType, filterUpcoming]);
  
  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Group by date if enabled
  const groupedEvents = useMemo(() => {
    if (!groupByDate) return null;
    return groupEventsByDate(paginatedEvents);
  }, [paginatedEvents, groupByDate]);
  
  // Event type options
  const eventTypeOptions: { value: EventType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'activity', label: 'Activity' },
    { value: 'learning', label: 'Learning' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'custom', label: 'Custom' },
  ];
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
            />
          </div>
          
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as EventType | 'all');
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
          >
            {eventTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Upcoming Filter */}
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] cursor-pointer hover:bg-[hsl(var(--muted)/0.3)]">
            <input
              type="checkbox"
              checked={filterUpcoming}
              onChange={(e) => {
                setFilterUpcoming(e.target.checked);
                setCurrentPage(1);
              }}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm whitespace-nowrap">Upcoming only</span>
          </label>
        </div>
      )}
      
      {/* Results count */}
      {filteredEvents.length > 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Showing {paginatedEvents.length} of {filteredEvents.length} event
          {filteredEvents.length !== 1 ? 's' : ''}
        </p>
      )}
      
      {/* Event List */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="No events found"
          description={
            searchQuery || filterType !== 'all' || filterUpcoming
              ? 'Try adjusting your filters'
              : 'Create your first event to get started'
          }
        />
      ) : groupedEvents ? (
        // Grouped by date
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([date, dateEvents]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] mb-3 sticky top-0 bg-[hsl(var(--background))] py-2 z-10">
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>
              <div className="space-y-3">
                {dateEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    compact={compact}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Regular list
        <div className="space-y-3">
          {paginatedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={onEdit}
              onDelete={onDelete}
              compact={compact}
            />
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

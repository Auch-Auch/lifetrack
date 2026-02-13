/**
 * Calendar Page
 * 
 * Main calendar interface with event management and learning plans
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useEventStore, useEventStats } from '../../stores/eventStore';
import { useLearningPlanStore, useActivePlanCount } from '../../stores/learningPlanStore';
import type { Event, LearningPlan } from '../../lib/events';
import CalendarView from '../../components/calendar/CalendarView';
import EventForm from '../../components/calendar/EventForm';
import EventList from '../../components/calendar/EventList';
import LearningPlanForm from '../../components/learning-plans/LearningPlanForm';
import LearningPlanList from '../../components/learning-plans/LearningPlanList';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Calendar, Plus, List, BookOpen, X, TrendingUp } from 'lucide-react';

type Tab = 'calendar' | 'events' | 'plans';
type ModalType = 'event' | 'plan' | null;

// ============================================================================
// Calendar Page
// ============================================================================

export default function CalendarPage() {
  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingEvent, setEditingEvent] = useState<Event | undefined>();
  const [editingPlan, setEditingPlan] = useState<LearningPlan | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  
  const eventStats = useEventStats();
  const activePlanCount = useActivePlanCount();
  
  const fetchEvents = useEventStore((state) => state.fetchEvents);
  const fetchPlans = useLearningPlanStore((state) => state.fetchPlans);
  
  // Initialize stores with current month's data
  useEffect(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    fetchEvents(
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    );
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle event selection from calendar
  const handleSelectEvent = (event: Event) => {
    setEditingEvent(event);
    setModalType('event');
  };
  
  // Handle time slot selection from calendar
  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    setSelectedDate(slotInfo.start);
    setEditingEvent(undefined);
    setModalType('event');
  };
  
  // Handle form success
  const handleFormSuccess = () => {
    setModalType(null);
    setEditingEvent(undefined);
    setEditingPlan(undefined);
    setSelectedDate(undefined);
  };
  
  // Handle form cancel
  const handleFormCancel = () => {
    setModalType(null);
    setEditingEvent(undefined);
    setEditingPlan(undefined);
    setSelectedDate(undefined);
  };
  
  // Handle edit from list
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setModalType('event');
  };
  
  const handleEditPlan = (plan: LearningPlan) => {
    setEditingPlan(plan);
    setModalType('plan');
  };
  
  // Tabs
  const tabs = [
    { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
    { id: 'events' as const, label: 'Events', icon: List },
    { id: 'plans' as const, label: 'Learning Plans', icon: BookOpen },
  ];
  
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Calendar"
        description="Manage your events and learning plans"
        action={
          <Button
            variant="primary"
            onClick={() => {
              setEditingEvent(undefined);
              setEditingPlan(undefined);
              setModalType(activeTab === 'plans' ? 'plan' : 'event');
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'plans' ? 'New Plan' : 'New Event'}
          </Button>
        }
      />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Total Events
                </p>
                <p className="text-2xl font-bold">{eventStats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-[hsl(var(--primary))]" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Today
                </p>
                <p className="text-2xl font-bold">{eventStats.today}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[hsl(var(--success))]" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Upcoming
                </p>
                <p className="text-2xl font-bold">{eventStats.upcoming}</p>
              </div>
              <Calendar className="w-8 h-8 text-[hsl(var(--info))]" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Active Plans
                </p>
                <p className="text-2xl font-bold">{activePlanCount}</p>
              </div>
              <BookOpen className="w-8 h-8 text-[hsl(var(--warning))]" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[hsl(var(--border))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))] font-medium'
                  : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'calendar' && (
          <CalendarView
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
          />
        )}
        
        {activeTab === 'events' && (
          <EventList
            onEdit={handleEditEvent}
            showFilters
            groupByDate
          />
        )}
        
        {activeTab === 'plans' && (
          <LearningPlanList
            onEdit={handleEditPlan}
            showFilters
          />
        )}
      </div>
      
      {/* Modal for Event/Plan Forms */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--background))] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[hsl(var(--background))] border-b border-[hsl(var(--border))] p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold">
                {modalType === 'event'
                  ? editingEvent
                    ? 'Edit Event'
                    : 'New Event'
                  : editingPlan
                  ? 'Edit Learning Plan'
                  : 'New Learning Plan'}
              </h2>
              <button
                onClick={handleFormCancel}
                className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {modalType === 'event' ? (
                <EventForm
                  event={editingEvent}
                  initialDate={selectedDate}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                />
              ) : (
                <LearningPlanForm
                  plan={editingPlan}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

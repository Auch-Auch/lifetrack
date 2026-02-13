/**
 * Reminder Store with GraphQL Integration
 * 
 * Global state management for reminders and notifications
 */

'use client';

import { create } from 'zustand';
import type { 
  Reminder, 
  Notification,
  CreateReminderInput, 
  UpdateReminderInput,
  ReminderFilter 
} from '../lib/reminders';
import {
  getReminders as apiGetReminders,
  getReminderById as apiGetReminderById,
  getUpcomingReminders as apiGetUpcomingReminders,
  getOverdueReminders as apiGetOverdueReminders,
  createReminder as apiCreateReminder,
  updateReminder as apiUpdateReminder,
  deleteReminder as apiDeleteReminder,
  completeReminder as apiCompleteReminder,
  snoozeReminder as apiSnoozeReminder,
  getNotifications as apiGetNotifications,
  getPendingNotifications as apiGetPendingNotifications,
} from '../lib/reminders';
import { useToastStore } from './toastStore';

// ============================================================================
// Store Interface
// ============================================================================

interface ReminderStore {
  // State
  reminders: Reminder[];
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  
  // CRUD Operations
  fetchReminders: (filter?: ReminderFilter, limit?: number, offset?: number) => Promise<void>;
  fetchUpcomingReminders: (limit?: number) => Promise<void>;
  fetchOverdueReminders: () => Promise<void>;
  createReminder: (reminderData: CreateReminderInput) => Promise<Reminder>;
  updateReminder: (id: string, updates: UpdateReminderInput) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  completeReminder: (id: string) => Promise<void>;
  snoozeReminder: (id: string, minutes: number) => Promise<void>;
  getReminder: (id: string) => Reminder | undefined;
  
  // Notification Operations
  fetchNotifications: (sent?: boolean, limit?: number, offset?: number) => Promise<void>;
  fetchPendingNotifications: () => Promise<void>;
  
  // Query Operations (client-side filtering)
  getRemindersByPriority: (priority: string) => Reminder[];
  getRemindersByTag: (tag: string) => Reminder[];
  getCompletedReminders: () => Reminder[];
  getIncompleteReminders: () => Reminder[];
  searchReminders: (query: string) => Reminder[];
  
  // Bulk Operations
  bulkDeleteReminders: (ids: string[]) => Promise<void>;
  bulkCompleteReminders: (ids: string[]) => Promise<void>;
  
  // Error handling
  clearError: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useReminderStore = create<ReminderStore>()((set, get) => ({
  // Initial state
  reminders: [],
  notifications: [],
  loading: false,
  error: null,
  totalCount: 0,
  hasMore: false,
  
  clearError: () => set({ error: null }),
  
  // ========================================================================
  // API Operations - Reminders
  // ========================================================================
  
  fetchReminders: async (filter, limit, offset) => {
    try {
      set({ loading: true, error: null });
      const { reminders, totalCount, hasMore } = await apiGetReminders(filter, limit, offset);
      set({ reminders, totalCount, hasMore, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch reminders',
        loading: false
      });
    }
  },
  
  fetchUpcomingReminders: async (limit) => {
    try {
      set({ loading: true, error: null });
      const reminders = await apiGetUpcomingReminders(limit);
      set({ reminders, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch upcoming reminders',
        loading: false
      });
    }
  },
  
  fetchOverdueReminders: async () => {
    try {
      set({ loading: true, error: null });
      const reminders = await apiGetOverdueReminders();
      set({ reminders, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch overdue reminders',
        loading: false
      });
    }
  },
  
  createReminder: async (reminderData) => {
    try {
      set({ loading: true, error: null });
      const newReminder = await apiCreateReminder(reminderData);
      set(state => ({
        reminders: [...state.reminders, newReminder],
        loading: false
      }));
      useToastStore.getState().addToast('Reminder created successfully', 'success');
      return newReminder;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reminder';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addToast(errorMessage, 'error');
      throw error;
    }
  },
  
  updateReminder: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      const updatedReminder = await apiUpdateReminder(id, updates);
      set(state => ({
        reminders: state.reminders.map(r => r.id === id ? updatedReminder : r),
        loading: false
      }));
      useToastStore.getState().addToast('Reminder updated successfully', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update reminder';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addToast(errorMessage, 'error');
      throw error;
    }
  },
  
  deleteReminder: async (id) => {
    try {
      set({ loading: true, error: null });
      await apiDeleteReminder(id);
      set(state => ({
        reminders: state.reminders.filter(r => r.id !== id),
        loading: false
      }));
      useToastStore.getState().addToast('Reminder deleted successfully', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete reminder';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addToast(errorMessage, 'error');
      throw error;
    }
  },
  
  completeReminder: async (id) => {
    try {
      set({ loading: true, error: null });
      const completedReminder = await apiCompleteReminder(id);
      set(state => ({
        reminders: state.reminders.map(r => r.id === id ? completedReminder : r),
        loading: false
      }));
      useToastStore.getState().addToast('Reminder marked as complete', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete reminder';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addToast(errorMessage, 'error');
      throw error;
    }
  },
  
  snoozeReminder: async (id, minutes) => {
    try {
      set({ loading: true, error: null });
      const snoozedReminder = await apiSnoozeReminder(id, minutes);
      set(state => ({
        reminders: state.reminders.map(r => r.id === id ? snoozedReminder : r),
        loading: false
      }));
      useToastStore.getState().addToast(`Reminder snoozed for ${minutes} minutes`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to snooze reminder';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addToast(errorMessage, 'error');
      throw error;
    }
  },
  
  getReminder: (id) => {
    return get().reminders.find(r => r.id === id);
  },
  
  // ========================================================================
  // API Operations - Notifications
  // ========================================================================
  
  fetchNotifications: async (sent, limit, offset) => {
    try {
      set({ loading: true, error: null });
      const { notifications, totalCount, hasMore } = await apiGetNotifications(sent, limit, offset);
      set({ notifications, totalCount, hasMore, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
        loading: false
      });
    }
  },
  
  fetchPendingNotifications: async () => {
    try {
      set({ loading: true, error: null });
      const notifications = await apiGetPendingNotifications();
      set({ notifications, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch pending notifications',
        loading: false
      });
    }
  },
  
  // ========================================================================
  // Query Operations (Client-side filtering)
  // ========================================================================
  
  getRemindersByPriority: (priority) => {
    return get().reminders.filter(r => r.priority === priority);
  },
  
  getRemindersByTag: (tag) => {
    return get().reminders.filter(r => r.tags.includes(tag));
  },
  
  getCompletedReminders: () => {
    return get().reminders.filter(r => r.completed);
  },
  
  getIncompleteReminders: () => {
    return get().reminders.filter(r => !r.completed);
  },
  
  searchReminders: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().reminders.filter(r => 
      r.title.toLowerCase().includes(lowerQuery) ||
      (r.description && r.description.toLowerCase().includes(lowerQuery)) ||
      r.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  },
  
  // ========================================================================
  // Bulk Operations
  // ========================================================================
  
  bulkDeleteReminders: async (ids) => {
    try {
      set({ loading: true, error: null });
      await Promise.all(ids.map(id => apiDeleteReminder(id)));
      set(state => ({
        reminders: state.reminders.filter(r => !ids.includes(r.id)),
        loading: false
      }));
      useToastStore.getState().addToast(`Deleted ${ids.length} reminders`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete reminders';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addToast(errorMessage, 'error');
      throw error;
    }
  },
  
  bulkCompleteReminders: async (ids) => {
    try {
      set({ loading: true, error: null });
      const completedReminders = await Promise.all(ids.map(id => apiCompleteReminder(id)));
      set(state => ({
        reminders: state.reminders.map(r => {
          const completed = completedReminders.find(cr => cr.id === r.id);
          return completed || r;
        }),
        loading: false
      }));
      useToastStore.getState().addToast(`Completed ${ids.length} reminders`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete reminders';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addToast(errorMessage, 'error');
      throw error;
    }
  },
}));

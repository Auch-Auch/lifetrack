'use client'

import { getClient } from './helpers/api-client'

/**
 * Reminders and Notifications Data Models with GraphQL Integration
 */

// ============================================================================
// Reminder Types
// ============================================================================

export type ReminderPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type RepeatPattern = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueTime: string;
  completed: boolean;
  completedAt?: string;
  priority: ReminderPriority;
  repeatPattern: RepeatPattern;
  repeatRule?: string;
  repeatEnd?: string;
  eventId?: string;
  notificationChannels: string[];
  reminderTimes: number[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  eventId?: string;
  reminderId?: string;
  scheduledTime: string;
  sent: boolean;
  sentAt?: string;
  channel: string;
  notificationType: string;
  message?: string;
  createdAt: string;
}

export type CreateReminderInput = {
  title: string;
  description?: string;
  dueTime: string;
  priority?: ReminderPriority;
  repeatPattern?: RepeatPattern;
  repeatRule?: string;
  repeatEnd?: string;
  eventId?: string;
  notificationChannels?: string[];
  reminderTimes?: number[];
  tags?: string[];
}

export type UpdateReminderInput = {
  title?: string;
  description?: string;
  dueTime?: string;
  completed?: boolean;
  priority?: ReminderPriority;
  repeatPattern?: RepeatPattern;
  repeatRule?: string;
  repeatEnd?: string;
  eventId?: string;
  notificationChannels?: string[];
  reminderTimes?: number[];
  tags?: string[];
}

export interface ReminderFilter {
  completed?: boolean;
  priority?: ReminderPriority;
  tags?: string[];
  eventId?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// GraphQL Queries
// ============================================================================

const GET_REMINDERS_QUERY = `
  query GetReminders($filter: ReminderFilter, $limit: Int, $offset: Int) {
    reminders(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        id
        userId
        title
        description
        dueTime
        completed
        completedAt
        priority
        repeatPattern
        repeatRule
        repeatEnd
        eventId
        notificationChannels
        reminderTimes
        tags
        createdAt
        updatedAt
      }
      totalCount
      hasMore
    }
  }
`;

const GET_REMINDER_QUERY = `
  query GetReminder($id: UUID!) {
    reminder(id: $id) {
      id
      userId
      title
      description
      dueTime
      completed
      completedAt
      priority
      repeatPattern
      repeatRule
      repeatEnd
      eventId
      notificationChannels
      reminderTimes
      tags
      createdAt
      updatedAt
    }
  }
`;

const GET_UPCOMING_REMINDERS_QUERY = `
  query GetUpcomingReminders($limit: Int) {
    upcomingReminders(limit: $limit) {
      id
      userId
      title
      description
      dueTime
      completed
      completedAt
      priority
      repeatPattern
      repeatRule
      repeatEnd
      eventId
      notificationChannels
      reminderTimes
      tags
      createdAt
      updatedAt
    }
  }
`;

const GET_OVERDUE_REMINDERS_QUERY = `
  query GetOverdueReminders {
    overdueReminders {
      id
      userId
      title
      description
      dueTime
      completed
      completedAt
      priority
      repeatPattern
      repeatRule
      repeatEnd
      eventId
      notificationChannels
      reminderTimes
      tags
      createdAt
      updatedAt
    }
  }
`;

const GET_NOTIFICATIONS_QUERY = `
  query GetNotifications($sent: Boolean, $limit: Int, $offset: Int) {
    notifications(sent: $sent, limit: $limit, offset: $offset) {
      nodes {
        id
        userId
        eventId
        reminderId
        scheduledTime
        sent
        sentAt
        channel
        notificationType
        message
        createdAt
      }
      totalCount
      hasMore
    }
  }
`;

const GET_PENDING_NOTIFICATIONS_QUERY = `
  query GetPendingNotifications {
    pendingNotifications {
      id
      userId
      eventId
      reminderId
      scheduledTime
      sent
      sentAt
      channel
      notificationType
      message
      createdAt
    }
  }
`;

// ============================================================================
// GraphQL Mutations
// ============================================================================

const CREATE_REMINDER_MUTATION = `
  mutation CreateReminder($input: CreateReminderInput!) {
    createReminder(input: $input) {
      id
      userId
      title
      description
      dueTime
      completed
      completedAt
      priority
      repeatPattern
      repeatRule
      repeatEnd
      eventId
      notificationChannels
      reminderTimes
      tags
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_REMINDER_MUTATION = `
  mutation UpdateReminder($id: UUID!, $input: UpdateReminderInput!) {
    updateReminder(id: $id, input: $input) {
      id
      userId
      title
      description
      dueTime
      completed
      completedAt
      priority
      repeatPattern
      repeatRule
      repeatEnd
      eventId
      notificationChannels
      reminderTimes
      tags
      createdAt
      updatedAt
    }
  }
`;

const DELETE_REMINDER_MUTATION = `
  mutation DeleteReminder($id: UUID!) {
    deleteReminder(id: $id)
  }
`;

const COMPLETE_REMINDER_MUTATION = `
  mutation CompleteReminder($id: UUID!) {
    completeReminder(id: $id) {
      id
      userId
      title
      description
      dueTime
      completed
      completedAt
      priority
      repeatPattern
      repeatRule
      repeatEnd
      eventId
      notificationChannels
      reminderTimes
      tags
      createdAt
      updatedAt
    }
  }
`;

const SNOOZE_REMINDER_MUTATION = `
  mutation SnoozeReminder($id: UUID!, $minutes: Int!) {
    snoozeReminder(id: $id, minutes: $minutes) {
      id
      userId
      title
      description
      dueTime
      completed
      completedAt
      priority
      repeatPattern
      repeatRule
      repeatEnd
      eventId
      notificationChannels
      reminderTimes
      tags
      createdAt
      updatedAt
    }
  }
`;

// ============================================================================
// API Functions
// ============================================================================

export const getReminders = async (
  filter?: ReminderFilter,
  limit?: number,
  offset?: number
): Promise<{ reminders: Reminder[], totalCount: number, hasMore: boolean }> => {
  const client = getClient();
  const result = await client.query(GET_REMINDERS_QUERY, { filter, limit, offset }).toPromise();
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return {
    reminders: result.data?.reminders.nodes || [],
    totalCount: result.data?.reminders.totalCount || 0,
    hasMore: result.data?.reminders.hasMore || false,
  };
};

export const getReminderById = async (id: string): Promise<Reminder> => {
  const client = getClient();
  const result = await client.query(GET_REMINDER_QUERY, { id }).toPromise();
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return result.data?.reminder;
};

export const getUpcomingReminders = async (limit?: number): Promise<Reminder[]> => {
  const client = getClient();
  const result = await client.query(GET_UPCOMING_REMINDERS_QUERY, { limit }).toPromise();
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return result.data?.upcomingReminders || [];
};

export const getOverdueReminders = async (): Promise<Reminder[]> => {
  const client = getClient();
  const result = await client.query(GET_OVERDUE_REMINDERS_QUERY, {}).toPromise();
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return result.data?.overdueReminders || [];
};

export const getNotifications = async (
  sent?: boolean,
  limit?: number,
  offset?: number
): Promise<{ notifications: Notification[], totalCount: number, hasMore: boolean }> => {
  const client = getClient();
  const result = await client.query(GET_NOTIFICATIONS_QUERY, { sent, limit, offset }).toPromise();
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return {
    notifications: result.data?.notifications.nodes || [],
    totalCount: result.data?.notifications.totalCount || 0,
    hasMore: result.data?.notifications.hasMore || false,
  };
};

export const getPendingNotifications = async (): Promise<Notification[]> => {
  const client = getClient();
  const result = await client.query(GET_PENDING_NOTIFICATIONS_QUERY, {}).toPromise();
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return result.data?.pendingNotifications || [];
};

export const createReminder = async (input: CreateReminderInput): Promise<Reminder> => {
  const client = getClient();
  const result = await client.mutation(CREATE_REMINDER_MUTATION, { input }).toPromise();
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return result.data?.createReminder;
};

export const updateReminder = async (id: string, input: UpdateReminderInput): Promise<Reminder> => {
  const client = getClient();
  const result = await client.mutation(UPDATE_REMINDER_MUTATION, { id, input }).toPromise();
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return result.data?.updateReminder;
};

export const deleteReminder = async (id: string): Promise<boolean> => {
  const client = getClient();
  const result = await client.mutation(DELETE_REMINDER_MUTATION, { id }).toPromise();
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return result.data?.deleteReminder;
};

export const completeReminder = async (id: string): Promise<Reminder> => {
  const client = getClient();
  const result = await client.mutation(COMPLETE_REMINDER_MUTATION, { id }).toPromise();
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return result.data?.completeReminder;
};

export const snoozeReminder = async (id: string, minutes: number): Promise<Reminder> => {
  const client = getClient();
  const result = await client.mutation(SNOOZE_REMINDER_MUTATION, { id, minutes }).toPromise();
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return result.data?.snoozeReminder;
};

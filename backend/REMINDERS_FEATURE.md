# Reminders and Notifications Feature

## Overview

The reminders and notifications feature provides a comprehensive system for managing reminders that can work independently or be associated with events. The system includes a notification queue that handles both event-based and reminder-based notifications.

## Key Features

### Reminders
- **Independent Entity**: Reminders exist as standalone items and don't require an event
- **Optional Event Linking**: Can optionally link a reminder to an event
- **Priority Levels**: Low, Medium, High
- **Repeat Patterns**: None, Daily, Weekly, Monthly, Yearly, Custom (with iCal format support)
- **Flexible Notifications**: Multiple notification channels (browser, telegram, email)
- **Custom Reminder Times**: Set multiple reminder times (minutes before due time)
- **Status Tracking**: Mark reminders as completed, snooze them, or delete them
- **Tags**: Organize reminders with custom tags

### Notifications
- **Unified Queue**: Single notification queue for both events and reminders
- **Multiple Channels**: Support for browser, telegram, and email notifications
- **Scheduled Delivery**: Notifications scheduled based on reminder times
- **Status Tracking**: Track sent/pending status of notifications

## Database Schema

### Reminders Table
```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_time TIMESTAMPTZ NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  repeat_pattern VARCHAR(50) DEFAULT 'none', -- none, daily, weekly, monthly, yearly, custom
  repeat_rule TEXT, -- iCal format for custom patterns
  repeat_end TIMESTAMPTZ,
  event_id UUID REFERENCES events(id), -- Optional
  notification_channels TEXT[] DEFAULT '{"browser"}',
  reminder_times INT[] DEFAULT '{0}', -- Minutes before due_time
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enhanced Notifications Queue
```sql
ALTER TABLE notifications_queue 
  ALTER COLUMN event_id DROP NOT NULL,
  ADD COLUMN reminder_id UUID REFERENCES reminders(id),
  ADD COLUMN notification_type VARCHAR(20) DEFAULT 'event', -- event or reminder
  ADD COLUMN message TEXT;
```

## GraphQL API

### Types

#### Reminder
```graphql
type Reminder {
  id: UUID!
  userId: UUID!
  title: String!
  description: String
  dueTime: Time!
  completed: Boolean!
  completedAt: Time
  priority: ReminderPriority!
  repeatPattern: RepeatPattern!
  repeatRule: String
  repeatEnd: Time
  eventId: UUID
  event: Event
  notificationChannels: [String!]!
  reminderTimes: [Int!]!
  tags: [String!]!
  createdAt: Time!
  updatedAt: Time!
}
```

#### Notification
```graphql
type Notification {
  id: UUID!
  userId: UUID!
  eventId: UUID
  event: Event
  reminderId: UUID
  reminder: Reminder
  scheduledTime: Time!
  sent: Boolean!
  sentAt: Time
  channel: String!
  notificationType: String!
  message: String
  createdAt: Time!
}
```

### Mutations

#### Create Reminder
```graphql
mutation CreateReminder($input: CreateReminderInput!) {
  createReminder(input: $input) {
    id
    title
    dueTime
    priority
    notificationChannels
    reminderTimes
  }
}
```

Example input:
```json
{
  "input": {
    "title": "Team meeting preparation",
    "description": "Prepare slides for the quarterly review",
    "dueTime": "2026-02-15T10:00:00Z",
    "priority": "HIGH",
    "repeatPattern": "NONE",
    "notificationChannels": ["browser", "telegram"],
    "reminderTimes": [0, 15, 60],
    "tags": ["work", "meeting"]
  }
}
```

#### Update Reminder
```graphql
mutation UpdateReminder($id: UUID!, $input: UpdateReminderInput!) {
  updateReminder(id: $id, input: $input) {
    id
    title
    completed
  }
}
```

#### Complete Reminder
```graphql
mutation CompleteReminder($id: UUID!) {
  completeReminder(id: $id) {
    id
    completed
    completedAt
  }
}
```

#### Snooze Reminder
```graphql
mutation SnoozeReminder($id: UUID!, $minutes: Int!) {
  snoozeReminder(id: $id, minutes: $minutes) {
    id
    dueTime
  }
}
```

#### Delete Reminder
```graphql
mutation DeleteReminder($id: UUID!) {
  deleteReminder(id: $id)
}
```

### Queries

#### Get All Reminders (with filtering)
```graphql
query GetReminders($filter: ReminderFilter, $limit: Int, $offset: Int) {
  reminders(filter: $filter, limit: $limit, offset: $offset) {
    nodes {
      id
      title
      dueTime
      priority
      completed
    }
    totalCount
    hasMore
  }
}
```

Filter options:
```json
{
  "filter": {
    "completed": false,
    "priority": "HIGH",
    "tags": ["work"],
    "startDate": "2026-02-01T00:00:00Z",
    "endDate": "2026-02-28T23:59:59Z"
  }
}
```

#### Get Upcoming Reminders
```graphql
query GetUpcomingReminders($limit: Int) {
  upcomingReminders(limit: $limit) {
    id
    title
    dueTime
    priority
  }
}
```

#### Get Overdue Reminders
```graphql
query GetOverdueReminders {
  overdueReminders {
    id
    title
    dueTime
    priority
  }
}
```

#### Get Notifications
```graphql
query GetNotifications($sent: Boolean, $limit: Int, $offset: Int) {
  notifications(sent: $sent, limit: $limit, offset: $offset) {
    nodes {
      id
      scheduledTime
      sent
      channel
      notificationType
      message
    }
    totalCount
    hasMore
  }
}
```

#### Get Pending Notifications
```graphql
query GetPendingNotifications {
  pendingNotifications {
    id
    scheduledTime
    channel
    message
    reminder {
      title
    }
    event {
      title
    }
  }
}
```

### Subscriptions

#### Reminder Notifications
```graphql
subscription OnReminderNotification($userId: UUID!) {
  reminderNotification(userId: $userId) {
    reminder {
      id
      title
      dueTime
    }
    message
  }
}
```

## Usage Examples

### 1. Create a Simple Reminder
```graphql
mutation {
  createReminder(input: {
    title: "Buy groceries"
    description: "Milk, eggs, bread"
    dueTime: "2026-02-13T18:00:00Z"
    priority: MEDIUM
    notificationChannels: ["browser"]
    reminderTimes: [0]
    tags: ["personal", "shopping"]
  }) {
    id
    title
  }
}
```

### 2. Create a Recurring Reminder
```graphql
mutation {
  createReminder(input: {
    title: "Daily standup"
    dueTime: "2026-02-13T09:00:00Z"
    priority: HIGH
    repeatPattern: DAILY
    repeatEnd: "2026-12-31T23:59:59Z"
    notificationChannels: ["browser", "telegram"]
    reminderTimes: [0, 5]
    tags: ["work", "meeting"]
  }) {
    id
    title
    repeatPattern
  }
}
```

### 3. Link Reminder to Event
```graphql
mutation {
  createReminder(input: {
    title: "Prepare for meeting"
    dueTime: "2026-02-15T09:00:00Z"
    eventId: "550e8400-e29b-41d4-a716-446655440000"
    priority: HIGH
    reminderTimes: [60, 30]
  }) {
    id
    title
    event {
      title
    }
  }
}
```

### 4. Query Upcoming High Priority Reminders
```graphql
query {
  reminders(filter: {
    completed: false
    priority: HIGH
  }, limit: 10) {
    nodes {
      id
      title
      dueTime
      priority
    }
  }
}
```

### 5. Snooze a Reminder
```graphql
mutation {
  snoozeReminder(id: "550e8400-e29b-41d4-a716-446655440000", minutes: 30) {
    id
    dueTime
  }
}
```

## Migration

To apply the database migration:

```bash
cd backend
./migrate.sh up
```

This will:
1. Create the `reminders` table
2. Update the `notifications_queue` table to support both events and reminders
3. Add necessary indexes and constraints

## Implementation Details

### Notification Queue Population

When a reminder is created, the system automatically:
1. Creates entries in the `notifications_queue` table
2. Calculates scheduled times based on `reminderTimes` array
3. Creates separate notifications for each channel

Example: If `reminderTimes` is `[0, 15, 60]` and `notificationChannels` is `["browser", "telegram"]`, 
the system creates 6 notification entries (3 times × 2 channels).

### Snooze Functionality

When snoozed:
1. Updates the reminder's `due_time`
2. Updates all pending (not sent) notifications in the queue
3. Preserves the relative timing of notifications

### Repeat Pattern Support

- **NONE**: One-time reminder
- **DAILY**: Repeats every day
- **WEEKLY**: Repeats every week
- **MONTHLY**: Repeats every month
- **YEARLY**: Repeats every year
- **CUSTOM**: Uses iCal RRULE format in `repeatRule` field

## Next Steps

Potential enhancements:
1. Implement a background job to process pending notifications
2. Add email notification support
3. Implement recurring reminder generation
4. Add reminder templates
5. Implement reminder sharing between users
6. Add notification delivery status tracking

## Testing

To test the implementation:

1. Create a reminder:
```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query":"mutation { createReminder(input: {title: \"Test\", dueTime: \"2026-02-13T10:00:00Z\"}) { id title } }"}'
```

2. Query reminders:
```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query":"query { reminders(limit: 10) { nodes { id title dueTime } } }"}'
```

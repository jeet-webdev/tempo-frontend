/**
 * Application-wide constants
 * Centralized location for magic strings, routes, and configuration
 */

// Storage Keys
export const STORAGE_KEYS = {
  CHANNELS: 'passive_channels_data',
  TASKS: 'passive_tasks_data',
  USERS: 'passive_users_data',
  ROLES: 'passive_roles_data',
  OT_ENTRIES: 'passive_ot_entries_data',
  COMPLETED_TASKS: 'passive_completed_tasks_data',
  STAGE_EVENTS: 'passive_stage_events_data',
  APP_SETTINGS: 'passive_app_settings',
  EXPORT_RANGE: 'completed_export_range',
} as const;

// User Roles
export const USER_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Routes
export const ROUTES = {
  HOME: '/',
  CHANNELS: '/channels',
  KANBAN: '/kanban',
  COMPLETED: '/completed',
  BOOKMARKS: '/bookmarks',
  SETTINGS: '/settings',
  OT_LOG: '/ot-log',
  ANALYTICS: '/analytics',
  WEB_DOCK: '/web-dock',
} as const;

// Default Column Names
export const DEFAULT_COLUMN_NAMES = {
  SCRIPT: 'Script',
  AUDIO: 'Audio',
  EDIT: 'Edit',
  QA: 'QA',
  UPLOAD: 'Upload',
} as const;

// Z-Index Layers
export const Z_INDEX = {
  CONTENT: 1,
  OVERLAY: 10,
  MODAL: 50,
  TOAST: 100,
} as const;

// Animation Durations (ms)
export const ANIMATION = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 400,
} as const;

// Export Field Options
export const EXPORT_FIELDS = [
  'Channel',
  'Title',
  'Completed At',
  'Due Date',
  'Assignees',
  'Column Path',
  'Custom Fields',
  'Final Links',
] as const;
export type UserRole = 'owner' | 'channel_manager' | 'script_writer' | 'audio_editor' | 'video_editor';

export interface User {
  id: string;
  email: string;
  name: string;
  employeeCode: string;
  role: UserRole;
  password?: string; // Stored password (in production, this would be hashed)
  active?: boolean;
  assignedChannels?: string[]; // For channel managers
  managedChannels?: string[]; // Channels where user is the manager
  joinedDate?: Date;
  otHalfDayRate?: number;
  otFullDayRate?: number;
  baseSalary?: number;
  notes?: string;
  sidebarCollapsed?: boolean;
  webDockSites?: WebDockSite[];
}

export interface Role {
  id: string;
  name: string;
}

export type OTType = 'half_day' | 'full_day';

export interface OTEntry {
  id: string;
  userId: string;
  channelId: string;
  date: Date;
  type: OTType;
  amount: number;
  notes?: string;
  loggedBy: string;
  createdAt: Date;
}

export type CustomFieldType = 'link' | 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';

export interface CustomFieldPermission {
  editableByRoles?: string[];
  editableByColumnResponsibility?: boolean;
  editableByUsers?: string[];
}

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  order: number;
  showOnCardFront?: boolean;
  dropdownOptions?: string[];
  requiredInColumns?: string[];
  permissions?: CustomFieldPermission;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  columns: KanbanColumn[];
  customFields?: CustomField[];
  createdAt: Date;
  managerId?: string;
  members: string[]; // User IDs who have access to this channel
  columnAssignments: ColumnAssignment[]; // Maps columns to users/roles
  archived?: boolean;
  youtubeChannelId?: string; // YouTube Channel ID for analytics
}

export interface KanbanColumn {
  id: string;
  name: string;
  order: number;
}

export interface ColumnAssignment {
  columnId: string;
  assignedUserIds?: string[];
  assignedRoles?: string[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  channelId: string;
  columnId: string;
  assignedTo?: string;
  dueDate?: Date;
  notes: string[];
  links: string[]; // Legacy - will be migrated
  customFieldValues?: Record<string, any>;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  nextColumn?: string; // For pipeline tracking
}

export interface CompletedTask {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  channelId: string;
  channelName: string;
  columnId: string;
  columnName: string;
  assignedTo?: string;
  assignees: string[];
  dueDate?: Date;
  completedAt: Date;
  completedBy: string;
  createdBy?: string;
  customFieldValues?: Record<string, any>;
  notes: string[];
  links: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  scriptUrl?: string;
  audioUrl?: string;
  otherLinks?: string[];
}

export interface StageEvent {
  id: string;
  taskId: string;
  channelId: string;
  actorUserId: string;
  fromColumnId: string;
  toColumnId: string;
  eventType: 'stage_completed' | 'finalized';
  occurredAt: Date;
}

export interface WebDockSite {
  id: string;
  name: string;
  url: string;
  icon?: string;
  order: number;
}

export interface AppSettings {
  bookmarksEnabled: boolean;
}

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'script', name: 'Script', order: 0 },
  { id: 'audio', name: 'Audio', order: 1 },
  { id: 'edit', name: 'Edit', order: 2 },
  { id: 'qa', name: 'QA', order: 3 },
  { id: 'upload', name: 'Upload', order: 4 },
];

export const DEFAULT_ROLES: Role[] = [
  { id: 'script_writer', name: 'Script Writer' },
  { id: 'audio_editor', name: 'Audio Editor' },
  { id: 'video_editor', name: 'Video Editor' },
];
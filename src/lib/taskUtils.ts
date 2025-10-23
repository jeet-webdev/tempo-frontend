/**
 * Task utility functions
 */

import { Task, Channel } from '@/types';

/**
 * Get the next column for a task
 */
export const getNextColumn = (task: Task, channel: Channel | undefined) => {
  if (!channel) return null;
  const currentIndex = channel.columns.findIndex(col => col.id === task.columnId);
  return channel.columns[currentIndex + 1] || null;
};

/**
 * Get the current column for a task
 */
export const getCurrentColumn = (task: Task, channel: Channel | undefined) => {
  if (!channel) return null;
  return channel.columns.find(col => col.id === task.columnId) || null;
};

/**
 * Check if task is in last column
 */
export const isTaskInLastColumn = (task: Task, channel: Channel | undefined): boolean => {
  if (!channel) return false;
  const currentIndex = channel.columns.findIndex(col => col.id === task.columnId);
  return currentIndex === channel.columns.length - 1;
};

/**
 * Get user initials from name
 */
export const getUserInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

/**
 * Calculate task progress percentage
 */
export const calculateTaskProgress = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

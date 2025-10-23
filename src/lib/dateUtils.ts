import { isToday, isFuture, isPast, format } from 'date-fns';

/**
 * Date utility functions for task management
 */

/**
 * Check if a date is today
 */
export const isDateToday = (date: Date | null | undefined): boolean => {
  return date ? isToday(date) : false;
};

/**
 * Check if a date is in the future (excluding today)
 */
export const isDateFuture = (date: Date | null | undefined): boolean => {
  return date ? isFuture(date) && !isToday(date) : false;
};

/**
 * Check if a date is in the past (excluding today)
 */
export const isDatePast = (date: Date | null | undefined): boolean => {
  return date ? isPast(date) && !isToday(date) : false;
};

/**
 * Format date for display
 */
export const formatDate = (date: Date | null | undefined, formatStr = 'MMM d, yyyy'): string => {
  return date ? format(date, formatStr) : '';
};

/**
 * Get days difference from today
 */
export const getDaysFromToday = (date: Date | null | undefined): number => {
  if (!date) return 0;
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

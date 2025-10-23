import { useMemo } from 'react';
import { Task } from '@/types';
import { isToday, isFuture, isPast } from 'date-fns';

/**
 * Custom hook to filter tasks by date categories
 */
export function useTaskFilters(tasks: Task[]) {
  const todayTasks = useMemo(
    () => tasks.filter(t => t.dueDate && isToday(t.dueDate)),
    [tasks]
  );

  const futureTasks = useMemo(
    () => tasks.filter(t => t.dueDate && isFuture(t.dueDate) && !isToday(t.dueDate)),
    [tasks]
  );

  const pastDueTasks = useMemo(
    () => tasks.filter(t => t.dueDate && isPast(t.dueDate) && !isToday(t.dueDate)),
    [tasks]
  );

  const noDueDateTasks = useMemo(
    () => tasks.filter(t => !t.dueDate),
    [tasks]
  );

  return {
    todayTasks,
    futureTasks,
    pastDueTasks,
    noDueDateTasks,
  };
}

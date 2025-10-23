import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Task } from '@/types';
import { Calendar, CheckCircle2, ArrowRight, PartyPopper, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInDays, startOfWeek, endOfWeek, isPast, isFuture } from 'date-fns';
import TaskModal from '../TaskModal';
import MarkDoneDialog from '../MarkDoneDialog';
import { useToast } from '@/components/ui/use-toast';
import { useTaskFilters, useModal } from '@/hooks';
import { formatDate, isDateToday, isDatePast } from '@/lib/dateUtils';
import { getUserInitials, getCurrentColumn, getNextColumn } from '@/lib/taskUtils';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { tasks, updateTask, channels, otEntries, users, completedTasks, addCompletedTask, addStageEvent } = useData();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [markDoneTask, setMarkDoneTask] = useState<Task | null>(null);
  const [upcomingPastTab, setUpcomingPastTab] = useState<'upcoming' | 'pastdue'>('upcoming');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Filter tasks: assigned to user AND not completed (no completedAt)
  const myTasks = tasks.filter(t => {
    // Direct assignment takes priority
    if (t.assignedTo === user?.id) {
      return !t.completed;
    }
    
    // Otherwise check column assignments
    const channel = channels.find(c => c.id === t.channelId);
    const columnAssignment = channel?.columnAssignments?.find(ca => ca.columnId === t.columnId);
    const isAssignedToColumn = columnAssignment?.assignedUserIds?.includes(user?.id || '');
    
    return isAssignedToColumn && !t.completed;
  });

  // Get recently completed tasks by this employee (last 5)
  const myRecentlyCompleted = useMemo(() => {
    return completedTasks
      .filter(t => t.completedBy === user?.id)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
      .slice(0, 5);
  }, [completedTasks, user?.id]);

  // Get last completed task
  const lastCompletedTask = useMemo(() => {
    if (myRecentlyCompleted.length === 0) return null;
    return myRecentlyCompleted[0];
  }, [myRecentlyCompleted]);

  // Use custom hook for task filtering - UPDATED to include tasks without due dates
  const todayTasks = myTasks.filter(t => t.dueDate && isDateToday(t.dueDate));
  const pastDueTasks = myTasks.filter(t => t.dueDate && isDatePast(t.dueDate));
  const futureTasks = myTasks.filter(t => {
    if (!t.dueDate) return true; // Include tasks without due dates
    return !isDateToday(t.dueDate) && !isDatePast(t.dueDate);
  }).sort((a, b) => {
    // Sort: dated tasks first (by date), then undated tasks (by createdAt desc)
    if (!a.dueDate && !b.dueDate) return b.createdAt.getTime() - a.createdAt.getTime();
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  // Week progress
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const weekTasks = myTasks.filter(t => 
    t.dueDate && 
    t.dueDate >= weekStart && 
    t.dueDate <= weekEnd
  );
  const weekCompletedTasks = myRecentlyCompleted.filter(t =>
    t.completedAt >= weekStart &&
    t.completedAt <= weekEnd
  );
  const weekCompleted = weekCompletedTasks.length;
  const weekTotal = weekTasks.length + weekCompleted;
  const weekProgress = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

  // KPI sparklines (last 7 days)
  const last7Days = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayTasks = myTasks.filter(t => 
        t.dueDate && 
        format(t.dueDate, 'yyyy-MM-dd') === dateStr
      );
      
      const dayCompleted = myRecentlyCompleted.filter(t =>
        format(t.completedAt, 'yyyy-MM-dd') === dateStr
      );
      
      data.push({
        today: dayTasks.filter(t => format(new Date(), 'yyyy-MM-dd') === dateStr).length,
        overdue: dayTasks.filter(t => isPast(t.dueDate!)).length,
        upcoming: dayTasks.filter(t => isFuture(t.dueDate!)).length,
        completed: dayCompleted.length
      });
    }
    return data;
  }, [myTasks, myRecentlyCompleted]);

  // OT entries for current month
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const myOTEntries = otEntries.filter(e => 
    e.userId === user?.id &&
    e.date >= currentMonthStart &&
    e.date <= currentMonthEnd
  );
  const totalOT = myOTEntries.reduce((sum, e) => sum + e.amount, 0);

  // Export OT log
  const handleExportOT = () => {
    const csvData = myOTEntries.map(entry => {
      const channel = channels.find(c => c.id === entry.channelId);
      return {
        date: format(entry.date, 'yyyy-MM-dd'),
        channel: channel?.name || 'N/A',
        type: entry.type === 'half_day' ? 'Half Day' : 'Full Day',
        amount: entry.amount,
        notes: entry.notes || ''
      };
    });

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `\"${row[h as keyof typeof row]}\"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ot-log-${format(new Date(), 'yyyy-MM')}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "OT log exported to CSV.",
    });
  };

  const handleMarkDone = async (taskId: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        toast({
          title: "Error",
          description: "Task not found.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const channel = channels.find(c => c.id === task.channelId);
      if (!channel) {
        toast({
          title: "Error",
          description: "Channel not found.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const currentColumnIndex = channel.columns.findIndex(col => col.id === task.columnId);
      const currentColumn = channel.columns[currentColumnIndex];
      const nextColumn = currentColumnIndex < channel.columns.length - 1 
        ? channel.columns[currentColumnIndex + 1] 
        : null;

      if (!nextColumn) {
        // Last column - don't finalize, just show message
        toast({
          title: "Awaiting manager finalization",
          description: "Your work is complete. A manager will finalize this video.",
        });
        setMarkDoneTask(null);
        setIsProcessing(false);
        return;
      }

      // Advance to next column
      const nextColumnAssignment = channel.columnAssignments?.find(ca => ca.columnId === nextColumn.id);
      const nextAssignee = nextColumnAssignment?.assignedUserIds?.[0] || undefined;

      // Update task first
      updateTask(taskId, { 
        columnId: nextColumn.id,
        assignedTo: nextAssignee,
        updatedAt: new Date(),
      });

      // Record stage completion event for analytics
      addStageEvent({
        taskId: task.id,
        channelId: task.channelId,
        actorUserId: user?.id || '',
        fromColumnId: task.columnId,
        toColumnId: nextColumn.id,
        eventType: 'stage_completed',
      });

      // Log completion in completedTasks for employee's "Recently Completed" section
      addCompletedTask({
        taskId: task.id,
        title: task.title,
        description: task.description,
        channelId: task.channelId,
        channelName: channel.name,
        columnId: task.columnId,
        columnName: currentColumn.name,
        assignedTo: task.assignedTo,
        assignees: task.assignedTo ? [task.assignedTo] : [],
        dueDate: task.dueDate,
        completedBy: user?.id || '',
        createdBy: user?.id,
        customFieldValues: task.customFieldValues,
        notes: task.notes,
        links: task.links,
      });

      setMarkDoneTask(null);
      
      // Show success toast
      const assignedUserName = nextAssignee ? users.find(u => u.id === nextAssignee)?.name : null;
      toast({
        title: `Moved to ${nextColumn.name}`,
        description: assignedUserName 
          ? `Task assigned to ${assignedUserName}.` 
          : 'Task moved successfully.',
      });
    } catch (error) {
      console.error('Error advancing task:', error);
      toast({
        title: "Failed",
        description: "Failed to advance task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const Sparkline = ({ data, color = '#6C47FF' }: { data: number[]; color?: string }) => {
    const max = Math.max(...data, 1);
    return (
      <div className="flex items-end gap-0.5 h-8">
        {data.map((value, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-all"
            style={{
              height: `${(value / max) * 100}%`,
              minHeight: '2px',
              background: color
            }}
          />
        ))}
      </div>
    );
  };

  const TaskCard = ({ task, variant = 'default' }: { task: Task; variant?: 'default' | 'upcoming' | 'pastdue' }) => {
    const channel = channels.find(c => c.id === task.channelId);
    const currentColumn = getCurrentColumn(task, channel);
    const nextColumn = getNextColumn(task, channel);
    const daysOverdue = task.dueDate ? differenceInDays(new Date(), task.dueDate) : 0;

    return (
      <div 
        className="task-card-liquid cursor-pointer"
        onClick={() => setSelectedTask(task)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-heading mb-2 truncate">{task.title}</h3>
            <p className="text-sm text-body mb-3">{channel?.name}</p>
            
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="badge-liquid text-xs">
                {currentColumn?.name}
              </span>
              {nextColumn && (
                <div className="flex items-center gap-1 text-xs text-body italic">
                  <ArrowRight className="h-3 w-3" />
                  <span>Next: {nextColumn.name}</span>
                </div>
              )}
            </div>
            
            {task.dueDate && (
              <div className="flex items-center text-xs text-muted">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(task.dueDate)}
                {variant === 'pastdue' && daysOverdue > 0 && (
                  <span className="ml-2 badge-danger text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Overdue by {daysOverdue} day{daysOverdue > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMarkDoneTask(task);
            }}
            disabled={isProcessing}
            className="btn-liquid h-10 px-4 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            Submit
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Row 1: Hero + KPIs */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          
          {/* Hero Card */}
          <div className="col-span-12 lg:col-span-5 glass-card p-6 fade-in">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 flex items-center justify-center relative overflow-hidden shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <span className="text-white text-2xl font-bold relative z-10 drop-shadow-lg">
                  {user?.name && getUserInitials(user.name)}
                </span>
                <div className="absolute inset-0 rounded-3xl border border-white/30"></div>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-heading mb-2">
                  Welcome back, {user?.name}
                </h1>
                <span className="badge-liquid text-xs capitalize">
                  {user?.role.replace('_', ' ')}
                </span>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-label">Week Progress</span>
                <span className="text-sm font-bold text-heading">{weekCompleted}/{weekTotal}</span>
              </div>
              <div className="progress-bar-liquid">
                <div 
                  className="progress-fill-liquid"
                  style={{ width: `${weekProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted mt-2">{weekProgress}% complete</p>
              {lastCompletedTask && (
                <p className="text-xs text-muted mt-3">
                  Last completed: <span className="text-white font-semibold">{lastCompletedTask.title}</span> at {format(lastCompletedTask.completedAt, 'h:mm a')}
                </p>
              )}
            </div>
          </div>
          
          {/* KPI Tiles */}
          <div className="col-span-12 lg:col-span-7 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card-liquid fade-in hover:scale-105 transition-transform cursor-pointer border border-purple-500/20 hover:border-purple-500/40">
              <p className="text-label mb-2">Today</p>
              <p className="text-4xl font-bold gradient-text mb-3">{todayTasks.length}</p>
              <Sparkline data={last7Days.map(d => d.today)} color="#a855f7" />
            </div>
            
            <div className="stat-card-liquid card-pink fade-in hover:scale-105 transition-transform cursor-pointer border border-pink-500/20 hover:border-pink-500/40">
              <p className="text-label mb-2">Overdue</p>
              <p className="text-4xl font-bold text-white mb-3">{pastDueTasks.length}</p>
              <Sparkline data={last7Days.map(d => d.overdue)} color="#ef4444" />
            </div>
            
            <div className="stat-card-liquid card-cyan fade-in hover:scale-105 transition-transform cursor-pointer border border-cyan-500/20 hover:border-cyan-500/40">
              <p className="text-label mb-2">Upcoming (7d)</p>
              <p className="text-4xl font-bold text-white mb-3">{futureTasks.slice(0, 7).length}</p>
              <Sparkline data={last7Days.map(d => d.upcoming)} color="#22d3ee" />
            </div>
            
            <div className="stat-card-liquid card-green fade-in hover:scale-105 transition-transform cursor-pointer border border-green-500/20 hover:border-green-500/40">
              <p className="text-label mb-2">Completed (7d)</p>
              <p className="text-4xl font-bold text-white mb-3">{myRecentlyCompleted.filter(t => {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return t.completedAt >= sevenDaysAgo;
              }).length}</p>
              <Sparkline data={last7Days.map(d => d.completed)} color="#22c55e" />
            </div>
          </div>
        </div>

        {/* Row 2: Today's Tasks + Upcoming/Past Due */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          
          {/* Today's Tasks */}
          <div className="col-span-12 lg:col-span-6 glass-card p-6 fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-heading">Today's Tasks</h2>
              {todayTasks.length > 0 && (
                <span className="badge-liquid">{todayTasks.length}</span>
              )}
            </div>
            
            {todayTasks.length === 0 ? (
              <div className="empty-state">
                <div className="relative">
                  <PartyPopper className="empty-state-icon" />
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl rounded-full"></div>
                </div>
                <p className="text-xl font-bold text-heading mb-2">🎉 All caught up</p>
                <p className="text-body text-sm">You've completed all your tasks for today!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {todayTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            )}
          </div>
          
          {/* Upcoming & Past Due */}
          <div className="col-span-12 lg:col-span-6 glass-card p-6 fade-in">
            <Tabs value={upcomingPastTab} onValueChange={(v) => setUpcomingPastTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-6 glass-card p-1">
                <TabsTrigger value="upcoming" className="data-[state=active]:glass-card">
                  Upcoming
                  {futureTasks.length > 0 && (
                    <span className="badge-info ml-2 text-xs">{futureTasks.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pastdue" className="data-[state=active]:glass-card">
                  Past Due
                  {pastDueTasks.length > 0 && (
                    <span className="badge-danger ml-2 text-xs">{pastDueTasks.length}</span>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming" className="space-y-4 max-h-[500px] overflow-y-auto">
                {futureTasks.length === 0 ? (
                  <div className="empty-state">
                    <p className="text-body text-sm">No upcoming tasks scheduled.</p>
                  </div>
                ) : (
                  futureTasks.slice(0, 5).map(task => <TaskCard key={task.id} task={task} variant="upcoming" />)
                )}
              </TabsContent>
              
              <TabsContent value="pastdue" className="space-y-4 max-h-[500px] overflow-y-auto">
                {pastDueTasks.length === 0 ? (
                  <div className="empty-state">
                    <p className="text-body text-sm">No overdue tasks.</p>
                  </div>
                ) : (
                  pastDueTasks.map(task => <TaskCard key={task.id} task={task} variant="pastdue" />)
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Row 3: Recently Completed + My Overtime */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Recently Completed */}
          {myRecentlyCompleted.length > 0 && (
            <div className="col-span-12 lg:col-span-6 glass-card p-6 fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-heading">Recently Completed</h2>
              </div>
              
              <div className="space-y-3">
                {myRecentlyCompleted.map(task => {
                  const channel = channels.find(c => c.id === task.channelId);
                  return (
                    <div 
                      key={task.id} 
                      className="glass-card p-4 flex items-center gap-3 card-green cursor-pointer hover:scale-[1.02] transition-all group"
                      onClick={() => {
                        const originalTask = tasks.find(t => t.id === task.taskId);
                        if (originalTask) setSelectedTask(originalTask);
                      }}
                    >
                      <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{task.title}</p>
                        <p className="text-xs text-white/70">{task.channelName} • {task.columnName}</p>
                      </div>
                      <span className="text-xs text-white/70 shrink-0">
                        {format(task.completedAt, 'MMM d')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {myRecentlyCompleted.length === 0 && (
            <div className="col-span-12 lg:col-span-6 glass-card p-6 fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-heading">Recently Completed</h2>
              </div>
              <div className="empty-state">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 blur-[1px]">
                  <CheckCircle2 className="h-8 w-8 text-white/40" />
                </div>
                <p className="text-body text-sm">Your recent completions will appear here</p>
              </div>
            </div>
          )}

          {/* My Overtime */}
          {myOTEntries.length > 0 && (
            <div className="col-span-12 lg:col-span-6 glass-card p-6 fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-heading">My Overtime (This Month)</h2>
                <button 
                  onClick={handleExportOT}
                  className="btn-secondary-liquid h-9 px-4 text-sm"
                >
                  Export OT Log
                </button>
              </div>
              
              <div className="space-y-3 mb-6">
                {myOTEntries.slice(0, 5).map(entry => {
                  const channel = channels.find(c => c.id === entry.channelId);
                  const isFullDay = entry.type === 'full_day';
                  return (
                    <div key={entry.id} className={`glass-card p-4 flex items-center justify-between border ${isFullDay ? 'border-purple-500/30' : 'border-blue-500/30'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-semibold text-heading text-sm">
                            {format(entry.date, 'MMM d')}
                          </span>
                          <span className="text-muted">•</span>
                          <span className="text-body text-xs">{channel?.name}</span>
                          <span className={`badge-liquid text-xs ${isFullDay ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                            {entry.type === 'half_day' ? 'Half Day' : 'Full Day'}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                          <div 
                            className={`h-full ${isFullDay ? 'bg-gradient-to-r from-purple-500 to-purple-400' : 'bg-gradient-to-r from-blue-500 to-blue-400'}`}
                            style={{ width: isFullDay ? '100%' : '50%' }}
                          />
                        </div>
                      </div>
                      <p className="text-lg font-bold gradient-text ml-4">
                        ₹{entry.amount}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              <div className="divider-liquid"></div>
              <div className="flex items-center justify-between pt-4">
                <span className="text-body font-semibold text-sm">Total for this month:</span>
                <span className="text-3xl font-bold gradient-text animate-pulse">
                  ₹{totalOT.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
        />
      )}

      {markDoneTask && (
        <MarkDoneDialog
          task={markDoneTask}
          open={!!markDoneTask}
          onOpenChange={(open) => !open && setMarkDoneTask(null)}
          onConfirm={() => handleMarkDone(markDoneTask.id)}
        />
      )}
    </div>
  );
}
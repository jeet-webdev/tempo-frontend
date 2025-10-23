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
import TaskModal from './TaskModal';
import MarkDoneDialog from './MarkDoneDialog';
import { useToast } from '@/components/ui/use-toast';
import { useTaskFilters, useModal } from '@/hooks';
import { formatDate, isDateToday, isDatePast } from '@/lib/dateUtils';
import { getUserInitials, getCurrentColumn, getNextColumn } from '@/lib/taskUtils';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { tasks, updateTask, channels, otEntries } = useData();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [markDoneTask, setMarkDoneTask] = useState<Task | null>(null);
  const [upcomingPastTab, setUpcomingPastTab] = useState<'upcoming' | 'pastdue'>('upcoming');
  const { toast } = useToast();

  const myTasks = tasks.filter(t => t.assignedTo === user?.id && !t.completed);
  const completedTasks = tasks.filter(t => t.assignedTo === user?.id && t.completed).slice(0, 5);

  // Use custom hook for task filtering
  const { todayTasks, futureTasks, pastDueTasks } = useTaskFilters(myTasks);

  // Week progress
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const weekTasks = tasks.filter(t => 
    t.assignedTo === user?.id && 
    t.dueDate && 
    t.dueDate >= weekStart && 
    t.dueDate <= weekEnd
  );
  const weekCompleted = weekTasks.filter(t => t.completed).length;
  const weekTotal = weekTasks.length;
  const weekProgress = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

  // KPI sparklines (last 7 days)
  const last7Days = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayTasks = tasks.filter(t => 
        t.assignedTo === user?.id && 
        t.dueDate && 
        format(t.dueDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      data.push({
        today: dayTasks.filter(t => !t.completed).length,
        overdue: dayTasks.filter(t => isPast(t.dueDate!) && !t.completed).length,
        upcoming: dayTasks.filter(t => isFuture(t.dueDate!) && !t.completed).length,
        completed: dayTasks.filter(t => t.completed).length
      });
    }
    return data;
  }, [tasks, user]);

  // OT entries for current month
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const myOTEntries = otEntries.filter(e => 
    e.userId === user?.id &&
    e.date >= currentMonthStart &&
    e.date <= currentMonthEnd
  );
  const totalOT = myOTEntries.reduce((sum, e) => sum + e.amount, 0);

  const handleMarkDone = (taskId: string) => {
    updateTask(taskId, { completed: true });
    setMarkDoneTask(null);
    
    toast({
      title: "Task completed",
      description: "Task marked as done.",
    });
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
            className="btn-liquid h-10 px-4 text-sm flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark Done
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
            </div>
          </div>
          
          {/* KPI Tiles */}
          <div className="col-span-12 lg:col-span-7 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card-liquid fade-in">
              <p className="text-label mb-2">Today</p>
              <p className="text-4xl font-bold gradient-text mb-3">{todayTasks.length}</p>
              <Sparkline data={last7Days.map(d => d.today)} color="#a855f7" />
            </div>
            
            <div className="stat-card-liquid card-pink fade-in">
              <p className="text-label mb-2">Overdue</p>
              <p className="text-4xl font-bold text-white mb-3">{pastDueTasks.length}</p>
              <Sparkline data={last7Days.map(d => d.overdue)} color="#ef4444" />
            </div>
            
            <div className="stat-card-liquid card-cyan fade-in">
              <p className="text-label mb-2">Upcoming (7d)</p>
              <p className="text-4xl font-bold text-white mb-3">{futureTasks.slice(0, 7).length}</p>
              <Sparkline data={last7Days.map(d => d.upcoming)} color="#22d3ee" />
            </div>
            
            <div className="stat-card-liquid card-green fade-in">
              <p className="text-label mb-2">Completed (7d)</p>
              <p className="text-4xl font-bold text-white mb-3">{completedTasks.length}</p>
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
                <PartyPopper className="empty-state-icon" />
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
          {completedTasks.length > 0 && (
            <div className="col-span-12 lg:col-span-6 glass-card p-6 fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-heading">Recently Completed</h2>
                <button className="btn-secondary-liquid h-9 px-4 text-sm">
                  View More
                </button>
              </div>
              
              <div className="space-y-3">
                {completedTasks.map(task => {
                  const channel = channels.find(c => c.id === task.channelId);
                  return (
                    <div key={task.id} className="glass-card p-4 flex items-center gap-3 card-green">
                      <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{task.title}</p>
                        <p className="text-xs text-white/70">{channel?.name}</p>
                      </div>
                      <span className="text-xs text-white/70 shrink-0">
                        {task.updatedAt && format(task.updatedAt, 'MMM d')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* My Overtime */}
          {myOTEntries.length > 0 && (
            <div className="col-span-12 lg:col-span-6 glass-card p-6 fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-heading">My Overtime (This Month)</h2>
                <button className="btn-secondary-liquid h-9 px-4 text-sm">
                  View All
                </button>
              </div>
              
              <div className="space-y-3 mb-6">
                {myOTEntries.slice(0, 5).map(entry => {
                  const channel = channels.find(c => c.id === entry.channelId);
                  return (
                    <div key={entry.id} className="glass-card p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-heading text-sm">
                            {format(entry.date, 'MMM d')}
                          </span>
                          <span className="text-muted">•</span>
                          <span className="text-body text-xs">{channel?.name}</span>
                          <span className="badge-liquid text-xs">
                            {entry.type === 'half_day' ? 'Half Day' : 'Full Day'}
                          </span>
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
                <span className="text-3xl font-bold gradient-text">
                  ₹{totalOT}
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
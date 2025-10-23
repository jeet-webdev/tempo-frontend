import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, TrendingUp, Users, Eye, ThumbsUp, Video, ExternalLink, RefreshCw, AlertCircle, Download, Clock, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInDays, subDays, addDays, isAfter, isBefore, isToday, startOfDay, eachDayOfInterval, startOfMonth, endOfMonth, isPast, isFuture } from 'date-fns';
import TaskModal from './tasks/TaskModal';
import { Task } from '@/types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface AnalyticsDashboardProps {
  onBack: () => void;
}

interface ChannelStats {
  channelId: string;
  channelName: string;
  youtubeChannelId: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  recentVideos: {
    title: string;
    viewCount: number;
    likeCount: number;
    publishedAt: string;
    thumbnailUrl: string;
    videoId: string;
  }[];
  error?: string;
}

const FILTER_STORAGE_KEY = 'owner_analytics_filters';

export default function AnalyticsDashboard({ channelId }: AnalyticsDashboardProps) {
  const { tasks, channels, users, completedTasks, stageEvents } = useData();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const channel = channels.find(c => c.id === channelId);
  if (!channel) return null;

  // Filter tasks for this channel - include tasks without due dates
  const channelTasks = tasks.filter(t => t.channelId === channelId && !t.completed);
  const overdueTasks = channelTasks.filter(t => t.dueDate && isPast(t.dueDate));
  const todayTasks = channelTasks.filter(t => t.dueDate && isToday(t.dueDate));
  const upcomingTasks = channelTasks.filter(t => {
    if (!t.dueDate) return true; // Include tasks without due dates
    return isFuture(t.dueDate) && !isToday(t.dueDate);
  });

  // Calculate stage completions and finalized videos for this channel
  const stageCompletions = stageEvents.filter(e => 
    e.eventType === 'stage_completed' &&
    e.channelId === channelId &&
    (!dateRange?.from || e.occurredAt >= dateRange.from) &&
    (!dateRange?.to || e.occurredAt <= dateRange.to)
  );
  
  const finalizedVideos = tasks.filter(t => 
    t.completed &&
    t.channelId === channelId &&
    (!dateRange?.from || t.updatedAt >= dateRange.from) &&
    (!dateRange?.to || t.updatedAt <= dateRange.to)
  );

  // Per-user analytics for this channel
  const channelMembers = users.filter(u => channel.members.includes(u.id));
  const userStats = channelMembers.map(user => {
    const userStageCompletions = stageCompletions.filter(e => e.actorUserId === user.id);
    const userFinalizedTasks = finalizedVideos.filter(t => t.assignedTo === user.id);
    const userActiveTasks = channelTasks.filter(t => t.assignedTo === user.id);
    
    return {
      user,
      stageCompletions: userStageCompletions.length,
      finalizedVideos: userFinalizedTasks.length,
      activeTasks: userActiveTasks.length,
      overdueTasks: userActiveTasks.filter(t => t.dueDate && isPast(t.dueDate)).length,
    };
  }).sort((a, b) => (b.stageCompletions + b.finalizedVideos) - (a.stageCompletions + a.finalizedVideos));

  // Per-column analytics
  const columnStats = channel.columns.map(column => {
    const columnStageCompletions = stageCompletions.filter(e => e.toColumnId === column.id);
    const columnActiveTasks = channelTasks.filter(t => t.columnId === column.id);
    
    return {
      column,
      stageCompletions: columnStageCompletions.length,
      activeTasks: columnActiveTasks.length,
      overdueTasks: columnActiveTasks.filter(t => t.dueDate && isPast(t.dueDate)).length,
    };
  });

  // Task velocity data (last 30 days)
  const taskVelocityData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    });

    return days.map(day => {
      const dayStr = format(day, 'MMM d');
      const created = channelTasks.filter(t => 
        format(startOfDay(t.createdAt), 'MMM d') === dayStr
      ).length;
      const completed = channelTasks.filter(t => 
        t.completed && format(startOfDay(t.updatedAt), 'MMM d') === dayStr
      ).length;
      
      return { date: dayStr, created, completed };
    });
  }, [channelTasks]);

  // Team utilization heatmap data
  const teamUtilizationData = useMemo(() => {
    return userStats.map(member => {
      const memberTasks = channelTasks.filter(t => t.assignedTo === member.user.id && !t.completed);
      const overdueTasks = memberTasks.filter(t => t.dueDate && isBefore(t.dueDate, new Date())).length;
      
      return {
        name: member.user.name,
        active: memberTasks.length,
        overdue: overdueTasks,
        utilization: memberTasks.length > 10 ? 'High' : memberTasks.length > 5 ? 'Medium' : 'Low'
      };
    }).sort((a, b) => b.active - a.active);
  }, [userStats, channelTasks]);

  // Completion rate trends (last 7 days)
  const completionTrendData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    return days.map(day => {
      const dayStr = format(day, 'EEE');
      const dayTasks = channelTasks.filter(t => 
        t.dueDate && format(startOfDay(t.dueDate), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      const completed = dayTasks.filter(t => t.completed).length;
      const total = dayTasks.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return { day: dayStr, rate, completed, total };
    });
  }, [channelTasks]);

  // Internal Analytics Calculations
  const kpis = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);

    const tasksToday = channelTasks.filter(t => t.dueDate && isToday(t.dueDate)).length;
    const overdue = channelTasks.filter(t => t.dueDate && isBefore(t.dueDate, today) && !t.completed).length;
    const completedLast7Days = channelTasks.filter(t => t.completed && t.updatedAt && isAfter(t.updatedAt, sevenDaysAgo)).length;
    const throughput = (completedLast7Days / 7).toFixed(1);
    const inProgress = channelTasks.filter(t => !t.completed).length;
    const blocked = 0;

    return { tasksToday, overdue, completedLast7Days, throughput, inProgress, blocked };
  }, [channelTasks]);

  const workloadByRole = useMemo(() => {
    const roleMap: Record<string, number> = {};
    channelTasks.filter(t => !t.completed).forEach(task => {
      const assignedUser = users.find(u => u.id === task.assignedTo);
      if (assignedUser) {
        const role = assignedUser.role.replace('_', ' ');
        roleMap[role] = (roleMap[role] || 0) + 1;
      }
    });
    return Object.entries(roleMap).sort((a, b) => b[1] - a[1]);
  }, [channelTasks, users]);

  const workloadByColumn = useMemo(() => {
    const columnMap: Record<string, number> = {};
    channelTasks.filter(t => !t.completed).forEach(task => {
      const channel = channels.find(c => c.id === task.channelId);
      const column = channel?.columns.find(col => col.id === task.columnId);
      if (column) {
        columnMap[column.name] = (columnMap[column.name] || 0) + 1;
      }
    });
    return Object.entries(columnMap).sort((a, b) => b[1] - a[1]);
  }, [channelTasks, channels]);

  const agingTasks = useMemo(() => {
    return channelTasks
      .filter(t => !t.completed)
      .map(task => {
        const channel = channels.find(c => c.id === task.channelId);
        const column = channel?.columns.find(col => col.id === task.columnId);
        const daysInColumn = differenceInDays(new Date(), task.updatedAt);
        return { task, channel, column, daysInColumn };
      })
      .sort((a, b) => b.daysInColumn - a.daysInColumn)
      .slice(0, 10);
  }, [channelTasks, channels]);

  const cycleTime = useMemo(() => {
    const completed = channelTasks.filter(t => t.completed);
    if (completed.length === 0) return 0;
    const totalDays = completed.reduce((sum, task) => {
      return sum + differenceInDays(task.updatedAt, task.createdAt);
    }, 0);
    return (totalDays / completed.length).toFixed(1);
  }, [channelTasks]);

  const onTimeRate = useMemo(() => {
    const completedWithDue = channelTasks.filter(t => t.completed && t.dueDate);
    if (completedWithDue.length === 0) return 0;
    const onTime = completedWithDue.filter(t => !isAfter(t.updatedAt, t.dueDate!)).length;
    return ((onTime / completedWithDue.length) * 100).toFixed(0);
  }, [channelTasks]);

  const duePipeline = useMemo(() => {
    const pipeline: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const date = addDays(new Date(), i);
      const dateStr = format(date, 'MMM d');
      pipeline[dateStr] = channelTasks.filter(t => 
        t.dueDate && format(t.dueDate, 'MMM d') === dateStr && !t.completed
      ).length;
    }
    return Object.entries(pipeline);
  }, [channelTasks]);

  const dueTomorrow = useMemo(() => {
    const tomorrow = addDays(new Date(), 1);
    return channelTasks
      .filter(t => t.dueDate && format(t.dueDate, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd') && !t.completed)
      .slice(0, 10);
  }, [channelTasks]);

  const handleExport = () => {
    const csvData = channelTasks.map(task => {
      const channel = channels.find(c => c.id === task.channelId);
      const column = channel?.columns.find(col => col.id === task.columnId);
      const assignedUser = users.find(u => u.id === task.assignedTo);
      const daysInColumn = differenceInDays(new Date(), task.updatedAt);
      const cycleTime = differenceInDays(task.updatedAt, task.createdAt);

      return {
        id: task.id,
        title: task.title,
        channel: channel?.name || '',
        column: column?.name || '',
        assignee: assignedUser?.name || '',
        role: assignedUser?.role || '',
        status: task.completed ? 'Completed' : 'In Progress',
        created: format(task.createdAt, 'yyyy-MM-dd'),
        due: task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : '',
        completed: task.completed ? format(task.updatedAt, 'yyyy-MM-dd') : '',
        days_in_column: daysInColumn,
        total_cycle_time: cycleTime,
      };
    });

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "Analytics data exported to CSV.",
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const toggleAllChannels = () => {
    if (selectedChannels.length === channels.length) {
      setSelectedChannels([]);
    } else {
      setSelectedChannels(channels.map(c => c.id));
    }
  };

  const maxWorkload = Math.max(...workloadByRole.map(([_, count]) => count), ...workloadByColumn.map(([_, count]) => count), 1);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={onBack}
              variant="ghost"
              className="modern-button modern-button-secondary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold gradient-text">Owner Analytics</h1>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="internal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="internal">Internal Analytics</TabsTrigger>
            <TabsTrigger value="youtube">YouTube Analytics</TabsTrigger>
          </TabsList>

          {/* Internal Analytics Tab */}
          <TabsContent value="internal" className="space-y-6">
            {/* Filters */}
            <div className="glass-card p-6 fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-heading">Filters</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Select value="channels" onValueChange={() => {}}>
                      <SelectTrigger className="w-40 modern-input h-9">
                        <SelectValue>
                          {selectedChannels.length} Channel{selectedChannels.length !== 1 ? 's' : ''}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="modern-modal">
                        <div className="p-2 space-y-2">
                          <div className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer" onClick={toggleAllChannels}>
                            <Checkbox checked={selectedChannels.length === channels.length} />
                            <span className="text-sm font-semibold">All Channels</span>
                          </div>
                          {channels.map(c => (
                            <div key={c.id} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer" onClick={() => toggleChannel(c.id)}>
                              <Checkbox checked={selectedChannels.includes(c.id)} />
                              <span className="text-sm">{c.name}</span>
                            </div>
                          ))}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-40 modern-input h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="modern-modal">
                      <SelectItem value="all">All Roles</SelectItem>
                      {Array.from(new Set(channelMembers.map(u => u.role))).map(role => (
                        <SelectItem key={role} value={role}>
                          {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(Number(v))}>
                    <SelectTrigger className="w-36 modern-input h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="modern-modal">
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleExport} className="modern-button modern-button-secondary h-9 px-4">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>

            {selectedChannels.length === 0 ? (
              <div className="glass-card p-16 text-center">
                <p className="text-heading text-lg font-bold mb-2">No channels selected</p>
                <p className="text-body">Please select at least one channel to view analytics.</p>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="stat-card-liquid card-blue fade-in">
                    <p className="text-label mb-2">Active Tasks</p>
                    <p className="text-4xl font-bold text-white mb-1">{channelTasks.length}</p>
                    <p className="text-xs text-white/60">Including {upcomingTasks.filter(t => !t.dueDate).length} without due dates</p>
                  </div>
                  <div className="stat-card-liquid card-red fade-in" style={{ animationDelay: '0.1s' }}>
                    <p className="text-label mb-2">Overdue</p>
                    <p className="text-4xl font-bold text-white mb-1">{overdueTasks.length}</p>
                    <p className="text-xs text-white/60">Requires attention</p>
                  </div>
                  <div className="stat-card-liquid card-green fade-in" style={{ animationDelay: '0.2s' }}>
                    <p className="text-label mb-2">Stage Completions</p>
                    <p className="text-4xl font-bold text-white mb-1">{stageCompletions.length}</p>
                    <p className="text-xs text-white/60">Tasks advanced in pipeline</p>
                  </div>
                  <div className="stat-card-liquid card-purple fade-in" style={{ animationDelay: '0.3s' }}>
                    <p className="text-label mb-2">Finalized Videos</p>
                    <p className="text-4xl font-bold text-white mb-1">{finalizedVideos.length}</p>
                    <p className="text-xs text-white/60">Completed & published</p>
                  </div>
                </div>

                {/* NEW: Task Velocity Chart */}
                <Card className="modern-card fade-in">
                  <CardHeader>
                    <CardTitle className="text-lg text-heading font-bold">Task Velocity (Last 30 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={taskVelocityData}>
                        <defs>
                          <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
                        <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            color: '#fff'
                          }} 
                        />
                        <Legend wrapperStyle={{ color: '#fff' }} />
                        <Area type="monotone" dataKey="created" stroke="#a855f7" fillOpacity={1} fill="url(#colorCreated)" name="Created" />
                        <Area type="monotone" dataKey="completed" stroke="#22c55e" fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* NEW: Completion Rate Trends */}
                <Card className="modern-card fade-in">
                  <CardHeader>
                    <CardTitle className="text-lg text-heading font-bold">Completion Rate by Day of Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={completionTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
                        <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            color: '#fff'
                          }} 
                        />
                        <Bar dataKey="rate" fill="url(#barGradient)" radius={[8, 8, 0, 0]} name="Completion Rate %" />
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* NEW: Team Utilization Heatmap */}
                <Card className="modern-card fade-in">
                  <CardHeader>
                    <CardTitle className="text-lg text-heading font-bold">Team Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {teamUtilizationData.map(member => (
                        <div key={member.name} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-heading">{member.name}</p>
                            <p className="text-xs text-body mt-1">
                              {member.active} active tasks {member.overdue > 0 && `• ${member.overdue} overdue`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                              member.utilization === 'High' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                              member.utilization === 'Medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                              'bg-green-500/20 text-green-300 border border-green-500/30'
                            }`}>
                              {member.utilization}
                            </div>
                            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min((member.active / 15) * 100, 100)}%`,
                                  background: member.utilization === 'High' ? 'linear-gradient(90deg, #ef4444, #dc2626)' :
                                             member.utilization === 'Medium' ? 'linear-gradient(90deg, #eab308, #ca8a04)' :
                                             'linear-gradient(90deg, #22c55e, #16a34a)'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Workload & Bottlenecks */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="modern-card fade-in">
                    <CardHeader>
                      <CardTitle className="text-lg text-heading font-bold">Workload by Role</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {workloadByRole.length === 0 ? (
                        <p className="text-body text-center py-8">No data for selected filters</p>
                      ) : (
                        workloadByRole.map(([role, count]) => (
                          <div key={role} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize text-heading font-semibold">{role}</span>
                              <span className="font-bold text-heading">{count}</span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${(count / maxWorkload) * 100}%`,
                                  background: 'linear-gradient(90deg, #a855f7, #ec4899)'
                                }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="modern-card fade-in">
                    <CardHeader>
                      <CardTitle className="text-lg text-heading font-bold">Workload by Column</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {workloadByColumn.length === 0 ? (
                        <p className="text-body text-center py-8">No data for selected filters</p>
                      ) : (
                        workloadByColumn.map(([column, count]) => (
                          <div key={column} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-heading font-semibold">{column}</span>
                              <span className="font-bold text-heading">{count}</span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${(count / maxWorkload) * 100}%`,
                                  background: 'linear-gradient(90deg, #22d3ee, #06b6d4)'
                                }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Aging Tasks & Flow Quality */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="modern-card fade-in">
                    <CardHeader>
                      <CardTitle className="text-lg text-heading font-bold">Aging Tasks (Longest in Column)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {agingTasks.length === 0 ? (
                          <p className="text-body text-center py-8">No tasks in progress</p>
                        ) : (
                          agingTasks.map(({ task, channel, column, daysInColumn }) => (
                            <div 
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className="p-4 modern-card hover:shadow-md cursor-pointer transition-all"
                            >
                              <div className="font-semibold text-sm text-heading">{task.title}</div>
                              <div className="text-xs text-body mt-2">
                                {channel?.name} • {column?.name} • <span className="font-bold">{daysInColumn} days</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="modern-card fade-in">
                    <CardHeader>
                      <CardTitle className="text-lg text-heading font-bold">Flow Quality</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 modern-card">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                            <Clock className="h-6 w-6 text-blue-400" />
                          </div>
                          <span className="text-sm text-heading font-semibold">Avg Cycle Time</span>
                        </div>
                        <span className="text-2xl font-bold text-heading">{cycleTime} <span className="text-base text-body">days</span></span>
                      </div>
                      <div className="flex items-center justify-between p-4 modern-card">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                            <CheckCircle2 className="h-6 w-6 text-green-400" />
                          </div>
                          <span className="text-sm text-heading font-semibold">On-time Rate</span>
                        </div>
                        <span className="text-2xl font-bold text-heading">{onTimeRate}<span className="text-base text-body">%</span></span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Due Pipeline */}
                <Card className="modern-card fade-in">
                  <CardHeader>
                    <CardTitle className="text-lg text-heading font-bold">Due Pipeline (Next 14 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {duePipeline.map(([date, count]) => (
                        <div key={date} className="flex flex-col items-center min-w-[70px]">
                          <div className="text-xs text-body mb-2 font-semibold">{date}</div>
                          <div 
                            className="w-14 rounded-t"
                            style={{ 
                              height: `${Math.max(count * 12, 6)}px`,
                              background: 'linear-gradient(180deg, #a855f7, #ec4899)'
                            }}
                          />
                          <div className="text-base font-bold text-heading mt-2">{count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Due Tomorrow */}
                {dueTomorrow.length > 0 && (
                  <Card className="modern-card fade-in">
                    <CardHeader>
                      <CardTitle className="text-lg text-heading font-bold">Due Tomorrow (Top 10)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dueTomorrow.map(task => {
                          const channel = channels.find(c => c.id === task.channelId);
                          const assignedUser = users.find(u => u.id === task.assignedTo);
                          return (
                            <div 
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className="p-4 modern-card hover:shadow-md cursor-pointer transition-all"
                            >
                              <div className="font-semibold text-sm text-heading">{task.title}</div>
                              <div className="text-xs text-body mt-2">
                                {channel?.name} • {assignedUser?.name || 'Unassigned'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* YouTube Analytics Tab */}
          <TabsContent value="youtube" className="space-y-6">
            {connectedChannels.length === 0 ? (
              <div className="glass-card p-16 text-center">
                <AlertCircle className="h-16 w-16 text-muted mx-auto mb-4" />
                <p className="text-xl font-bold text-heading mb-2">No YouTube Channels Connected</p>
                <p className="text-body text-sm mb-4">
                  Connect your YouTube channels to view analytics here.
                </p>
                <p className="text-muted text-xs">
                  Go to Channels → Channel Settings → Add YouTube Channel ID
                </p>
              </div>
            ) : (
              <>
                {/* YouTube Header */}
                <div className="flex items-center justify-end">
                  <Button
                    onClick={fetchYouTubeStats}
                    disabled={youtubeLoading}
                    className="modern-button modern-button-primary"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${youtubeLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {/* Overall Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="stat-card-liquid fade-in">
                    <p className="text-label mb-2">Total Subscribers</p>
                    <p className="text-4xl font-bold gradient-text">
                      {formatNumber(youtubeStats.reduce((sum, s) => sum + s.subscriberCount, 0))}
                    </p>
                  </div>
                  <div className="stat-card-liquid card-cyan fade-in">
                    <p className="text-label mb-2">Total Views</p>
                    <p className="text-4xl font-bold text-white">
                      {formatNumber(youtubeStats.reduce((sum, s) => sum + s.viewCount, 0))}
                    </p>
                  </div>
                  <div className="stat-card-liquid card-pink fade-in">
                    <p className="text-label mb-2">Total Videos</p>
                    <p className="text-4xl font-bold text-white">
                      {youtubeStats.reduce((sum, s) => sum + s.videoCount, 0)}
                    </p>
                  </div>
                  <div className="stat-card-liquid card-green fade-in">
                    <p className="text-label mb-2">Channels</p>
                    <p className="text-4xl font-bold text-white">
                      {connectedChannels.length}
                    </p>
                  </div>
                </div>

                {/* Channel Cards */}
                <div className="space-y-8">
                  {youtubeStats.map((channelStat) => (
                    <div key={channelStat.channelId} className="glass-card p-6 fade-in">
                      {channelStat.error ? (
                        <div className="flex items-center gap-4">
                          <AlertCircle className="h-8 w-8 text-red-400" />
                          <div>
                            <h2 className="text-xl font-bold text-heading mb-1">{channelStat.channelName}</h2>
                            <p className="text-body text-sm">Error: {channelStat.error}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Channel Header */}
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h2 className="text-2xl font-bold text-heading mb-2">{channelStat.channelName}</h2>
                              <a
                                href={`https://www.youtube.com/channel/${channelStat.youtubeChannelId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-body hover:text-white flex items-center gap-1"
                              >
                                View on YouTube
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>

                          {/* Channel Stats */}
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="glass-card p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-purple-400" />
                                <p className="text-label text-xs">Subscribers</p>
                              </div>
                              <p className="text-2xl font-bold text-white">
                                {formatNumber(channelStat.subscriberCount)}
                              </p>
                            </div>
                            <div className="glass-card p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Eye className="h-4 w-4 text-cyan-400" />
                                <p className="text-label text-xs">Total Views</p>
                              </div>
                              <p className="text-2xl font-bold text-white">
                                {formatNumber(channelStat.viewCount)}
                              </p>
                            </div>
                            <div className="glass-card p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Video className="h-4 w-4 text-pink-400" />
                                <p className="text-label text-xs">Videos</p>
                              </div>
                              <p className="text-2xl font-bold text-white">
                                {channelStat.videoCount}
                              </p>
                            </div>
                          </div>

                          {/* Recent Videos */}
                          {channelStat.recentVideos.length > 0 && (
                            <>
                              <h3 className="text-lg font-bold text-heading mb-4">Recent Videos</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {channelStat.recentVideos.map((video) => (
                                  <a
                                    key={video.videoId}
                                    href={`https://www.youtube.com/watch?v=${video.videoId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="glass-card p-3 hover:border-purple-500/50 transition-all group"
                                  >
                                    <img
                                      src={video.thumbnailUrl}
                                      alt={video.title}
                                      className="w-full aspect-video object-cover rounded-lg mb-3"
                                    />
                                    <h4 className="text-sm font-semibold text-heading mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                                      {video.title}
                                    </h4>
                                    <div className="flex items-center justify-between text-xs text-muted">
                                      <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                          <Eye className="h-3 w-3" />
                                          {formatNumber(video.viewCount)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <ThumbsUp className="h-3 w-3" />
                                          {formatNumber(video.likeCount)}
                                        </span>
                                      </div>
                                      <span>{formatDate(video.publishedAt)}</span>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
        />
      )}
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Search, TrendingUp, TrendingDown, CheckCircle2, Clock, 
  Activity, Video, Zap, DollarSign, BarChart3, Award, Target,
  Calendar, ArrowRight, Download, Filter, PlayCircle, AlertCircle
} from 'lucide-react';
import { 
  isToday, isPast, isFuture, subDays, subWeeks, format, 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  differenceInDays, eachDayOfInterval, startOfDay
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function OwnerDashboard() {
  const { user, switchUser } = useAuth();
  const { tasks, channels, users, completedTasks: completedTasksData, stageEvents } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<'7' | '30' | 'all'>('30');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'channel' | 'role'>('all');

  // Calculate date ranges
  const now = new Date();
  const last7Days = subDays(now, 7);
  const last30Days = subDays(now, 30);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Filter data by time range
  const filterByTimeRange = (date: Date) => {
    if (timeRange === '7') return date >= last7Days;
    if (timeRange === '30') return date >= last30Days;
    return true;
  };

  // Core metrics
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = completedTasksData.filter(t => filterByTimeRange(t.completedAt));
  const completedThisMonth = completedTasksData.filter(t => 
    t.completedAt >= monthStart && t.completedAt <= monthEnd
  );
  const completedLastMonth = completedTasksData.filter(t => {
    const lastMonthStart = startOfMonth(subDays(monthStart, 1));
    const lastMonthEnd = endOfMonth(subDays(monthStart, 1));
    return t.completedAt >= lastMonthStart && t.completedAt <= lastMonthEnd;
  });

  // Stage completions
  const stageCompletions = stageEvents.filter(e => 
    e.eventType === 'stage_completed' && filterByTimeRange(e.occurredAt)
  );
  const stageCompletionsThisWeek = stageEvents.filter(e => 
    e.eventType === 'stage_completed' && 
    e.occurredAt >= weekStart && 
    e.occurredAt <= weekEnd
  );

  // Finalized videos
  const finalizedVideos = stageEvents.filter(e => 
    e.eventType === 'finalized' && filterByTimeRange(e.occurredAt)
  );
  const finalizedThisMonth = stageEvents.filter(e => 
    e.eventType === 'finalized' && 
    e.occurredAt >= monthStart && 
    e.occurredAt <= monthEnd
  );

  // Average completion time
  const avgCompletionTime = useMemo(() => {
    if (completedTasks.length === 0) return 0;
    const totalDays = completedTasks.reduce((sum, ct) => {
      const originalTask = tasks.find(t => t.id === ct.taskId);
      if (!originalTask) return sum;
      return sum + differenceInDays(ct.completedAt, originalTask.createdAt);
    }, 0);
    return (totalDays / completedTasks.length).toFixed(1);
  }, [completedTasks, tasks]);

  // Team members active today
  const activeToday = users.filter(u => {
    const userActivity = stageEvents.filter(e => 
      e.actorUserId === u.id && isToday(e.occurredAt)
    );
    return userActivity.length > 0;
  }).length;

  // Trend calculations
  const channelsTrend = 0; // Channels don't change frequently
  const tasksTrend = completedThisMonth.length - completedLastMonth.length;
  const avgTimeTrend = 0; // Would need historical data

  // This week's progress
  const weekTasks = activeTasks.filter(t => 
    t.dueDate && t.dueDate >= weekStart && t.dueDate <= weekEnd
  );
  const weekCompleted = completedTasksData.filter(t => 
    t.completedAt >= weekStart && t.completedAt <= weekEnd
  );
  const weekTotal = weekTasks.length + weekCompleted.length;
  const weekProgress = weekTotal > 0 ? Math.round((weekCompleted.length / weekTotal) * 100) : 0;

  // Daily completions for this week
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const dailyCompletions = weekDays.map(day => {
    const count = completedTasksData.filter(t => 
      startOfDay(t.completedAt).getTime() === startOfDay(day).getTime()
    ).length;
    return { day: format(day, 'EEE'), count };
  });

  // Top performers
  const topPerformers = useMemo(() => {
    return users
      .filter(u => u.role !== 'owner')
      .map(user => {
        const userCompleted = completedTasksData.filter(t => 
          t.assignedTo === user.id && 
          t.completedAt >= monthStart && 
          t.completedAt <= monthEnd
        );
        const userStageCompletions = stageEvents.filter(e => 
          e.actorUserId === user.id && 
          e.eventType === 'stage_completed' &&
          e.occurredAt >= monthStart && 
          e.occurredAt <= monthEnd
        );
        const userActiveTasks = activeTasks.filter(t => t.assignedTo === user.id);
        
        const avgTime = userCompleted.length > 0
          ? userCompleted.reduce((sum, ct) => {
              const originalTask = tasks.find(t => t.id === ct.taskId);
              if (!originalTask) return sum;
              return sum + differenceInDays(ct.completedAt, originalTask.createdAt);
            }, 0) / userCompleted.length
          : 0;

        const efficiencyScore = userActiveTasks.length > 0
          ? Math.round((userCompleted.length / (userCompleted.length + userActiveTasks.length)) * 100)
          : 100;

        const assignedChannels = channels.filter(c => c.members.includes(user.id));

        return {
          user,
          completedThisMonth: userCompleted.length,
          stageCompletions: userStageCompletions.length,
          avgCompletionTime: avgTime.toFixed(1),
          efficiencyScore,
          assignedChannels: assignedChannels.length,
          totalScore: userCompleted.length + userStageCompletions.length
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);
  }, [users, completedTasksData, stageEvents, activeTasks, channels, tasks, monthStart, monthEnd]);

  // Top contributor this week
  const topContributor = useMemo(() => {
    const weeklyScores = users
      .filter(u => u.role !== 'owner')
      .map(user => {
        const completed = completedTasksData.filter(t => 
          t.assignedTo === user.id && 
          t.completedAt >= weekStart && 
          t.completedAt <= weekEnd
        ).length;
        return { user, score: completed };
      })
      .sort((a, b) => b.score - a.score);
    
    return weeklyScores[0] || null;
  }, [users, completedTasksData, weekStart, weekEnd]);

  // Channel performance
  const channelPerformance = useMemo(() => {
    return channels.map(channel => {
      const channelTasks = activeTasks.filter(t => t.channelId === channel.id);
      const channelCompleted = completedTasksData.filter(t => 
        t.channelId === channel.id && 
        t.completedAt >= weekStart && 
        t.completedAt <= weekEnd
      );
      const channelCompletedMonth = completedTasksData.filter(t => 
        t.channelId === channel.id && 
        t.completedAt >= monthStart && 
        t.completedAt <= monthEnd
      );
      
      const avgTime = channelCompletedMonth.length > 0
        ? channelCompletedMonth.reduce((sum, ct) => {
            const originalTask = tasks.find(t => t.id === ct.taskId);
            if (!originalTask) return sum;
            return sum + differenceInDays(ct.completedAt, originalTask.createdAt);
          }, 0) / channelCompletedMonth.length
        : 0;

      const totalTasks = channelTasks.length + channelCompletedMonth.length;
      const completionRate = totalTasks > 0 
        ? Math.round((channelCompletedMonth.length / totalTasks) * 100) 
        : 0;

      const manager = users.find(u => u.id === channel.managerId);

      return {
        channel,
        activeTasks: channelTasks.length,
        completedThisWeek: channelCompleted.length,
        completedThisMonth: channelCompletedMonth.length,
        teamMembers: channel.members.length,
        completionRate,
        avgTime: avgTime.toFixed(1),
        manager
      };
    }).sort((a, b) => b.completedThisMonth - a.completedThisMonth);
  }, [channels, activeTasks, completedTasksData, users, tasks, weekStart, weekEnd, monthStart, monthEnd]);

  // Task distribution by channel (for pie chart)
  const taskDistribution = useMemo(() => {
    const total = completedThisMonth.length;
    if (total === 0) return [];
    
    return channels.map(channel => {
      const count = completedThisMonth.filter(t => t.channelId === channel.id).length;
      const percentage = Math.round((count / total) * 100);
      return { channel: channel.name, count, percentage };
    }).filter(d => d.count > 0);
  }, [channels, completedThisMonth]);

  // Recent activity feed
  const recentActivity = useMemo(() => {
    const events = stageEvents
      .slice()
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, 10)
      .map(event => {
        const user = users.find(u => u.id === event.actorUserId);
        const channel = channels.find(c => c.id === event.channelId);
        const task = tasks.find(t => t.id === event.taskId);
        
        let message = '';
        if (event.eventType === 'stage_completed') {
          message = `moved a task to ${event.toStage} on ${channel?.name}`;
        } else if (event.eventType === 'finalized') {
          message = `finalized a video on ${channel?.name}`;
        }
        
        return {
          user,
          message,
          timestamp: event.occurredAt,
          type: event.eventType
        };
      });
    
    return events;
  }, [stageEvents, users, channels, tasks]);

  // Export functionality
  const handleExport = () => {
    const csvData = topPerformers.map(({ user, completedThisMonth, stageCompletions, avgCompletionTime, efficiencyScore, assignedChannels }) => ({
      name: user.name,
      role: user.role,
      completed_this_month: completedThisMonth,
      stage_completions: stageCompletions,
      avg_completion_time: avgCompletionTime,
      efficiency_score: efficiencyScore,
      assigned_channels: assignedChannels
    }));

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `control-hub-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "Dashboard data exported to CSV.",
    });
  };

  const TrendIndicator = ({ value }: { value: number }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(value)}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="max-w-[1800px] mx-auto mb-6">
        <div className="glass-card p-6 md:p-8 fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1 gradient-text">Control Hub</h1>
              <p className="text-body text-sm md:text-base">Real-time operational intelligence • Welcome back, {user?.name}</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                <SelectTrigger className="w-32 input-liquid h-10">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="modal-liquid">
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedFilter} onValueChange={(v: any) => setSelectedFilter(v)}>
                <SelectTrigger className="w-32 input-liquid h-10">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="modal-liquid">
                  <SelectItem value="all">All Data</SelectItem>
                  <SelectItem value="channel">By Channel</SelectItem>
                  <SelectItem value="role">By Role</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleExport} className="btn-secondary-liquid">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              {/* Demo: User Role Switcher */}
              <div className="glass-card px-4 py-3 flex items-center gap-3">
                <Users className="h-5 w-5 text-body" />
                <Select value={user?.role} onValueChange={(value: any) => switchUser(value)}>
                  <SelectTrigger className="h-10 w-[160px] input-liquid border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="modal-liquid">
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="channel_manager">Manager</SelectItem>
                    <SelectItem value="script_writer">Script Writer</SelectItem>
                    <SelectItem value="audio_editor">Audio Editor</SelectItem>
                    <SelectItem value="video_editor">Video Editor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* 1️⃣ OVERVIEW BAR - Executive Snapshot */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4">
          <Card className="stat-card-liquid card-purple fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-purple-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Channels</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{channels.length}</p>
            <TrendIndicator value={channelsTrend} />
          </Card>

          <Card className="stat-card-liquid card-cyan fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-cyan-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Active</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{activeTasks.length}</p>
            <p className="text-xs text-white/60">in progress</p>
          </Card>

          <Card className="stat-card-liquid card-green fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Completed</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{completedTasks.length}</p>
            <p className="text-xs text-white/60">all time</p>
          </Card>

          <Card className="stat-card-liquid card-blue fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">This Month</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{completedThisMonth.length}</p>
            <TrendIndicator value={tasksTrend} />
          </Card>

          <Card className="stat-card-liquid card-pink fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-pink-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Avg Time</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white mb-1">{avgCompletionTime}d</p>
            <TrendIndicator value={avgTimeTrend} />
          </Card>

          <Card className="stat-card-liquid card-purple fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-4 w-4 text-purple-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Videos</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{finalizedThisMonth.length}</p>
            <p className="text-xs text-white/60">finalized</p>
          </Card>

          <Card className="stat-card-liquid card-blue fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Team</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{activeToday}</p>
            <p className="text-xs text-white/60">active today</p>
          </Card>

          <Card className="stat-card-liquid card-orange fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.35s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-orange-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Stages</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stageCompletionsThisWeek.length}</p>
            <p className="text-xs text-white/60">this week</p>
          </Card>
        </div>

        {/* 2️⃣ THIS WEEK'S PROGRESS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 md:p-8 fade-in lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">This Week's Progress</h2>
                <p className="text-sm text-muted">{format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-3">
                  <div className="w-24 h-24 rounded-full relative">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - weekProgress / 100)}`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold gradient-text">{weekProgress}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{weekCompleted.length}</p>
                    <p className="text-sm text-muted">of {weekTotal} tasks</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-muted mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-400">{weekCompleted.length}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-muted mb-1">Pending</p>
                <p className="text-2xl font-bold text-cyan-400">{weekTasks.length}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-muted mb-1">Overdue</p>
                <p className="text-2xl font-bold text-red-400">{activeTasks.filter(t => t.dueDate && isPast(t.dueDate)).length}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-muted mb-1">In Progress</p>
                <p className="text-2xl font-bold text-purple-400">{activeTasks.length}</p>
              </div>
            </div>

            {/* Daily trend */}
            <div>
              <p className="text-sm text-muted mb-3 font-semibold">Daily Completions</p>
              <div className="flex items-end gap-2 h-32">
                {dailyCompletions.map((day, idx) => {
                  const maxCount = Math.max(...dailyCompletions.map(d => d.count), 1);
                  const height = (day.count / maxCount) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                      <div 
                        className="w-full rounded-t-lg bg-gradient-to-t from-purple-500/60 to-pink-500/60 transition-all hover:opacity-80"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      />
                      <p className="text-xs text-muted mt-2">{day.day}</p>
                      <p className="text-xs font-bold text-white">{day.count}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {topContributor && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <div className="flex items-center gap-3">
                  <Award className="h-6 w-6 text-yellow-400" />
                  <div>
                    <p className="text-xs text-muted font-semibold uppercase tracking-wide">Top Contributor This Week</p>
                    <p className="text-lg font-bold text-white">{topContributor.user.name}</p>
                  </div>
                  <Badge className="ml-auto badge-success">{topContributor.score} tasks</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="glass-card p-6 fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-btn-liquid">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold">Recent Activity</h3>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <Avatar className="h-8 w-8 avatar-liquid flex-shrink-0">
                    <AvatarFallback>{activity.user?.name.split(' ').map(n => n[0]).join('') || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-body">
                      <span className="font-semibold text-white">{activity.user?.name || 'Unknown'}</span> {activity.message}
                    </p>
                    <p className="text-xs text-muted mt-1">{format(activity.timestamp, 'MMM d, h:mm a')}</p>
                  </div>
                  {activity.type === 'finalized' && (
                    <PlayCircle className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3️⃣ TOP PERFORMERS PANEL */}
        <div className="glass-card p-6 md:p-8 fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="icon-btn-liquid">
                <Award className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">Team Leaderboard</h2>
            </div>
            <Badge className="badge-primary">{topPerformers.length} Members</Badge>
          </div>

          <div className="overflow-x-auto">
            <Table className="table-liquid">
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Stages</TableHead>
                  <TableHead className="text-right">Avg Time</TableHead>
                  <TableHead className="text-right">Efficiency</TableHead>
                  <TableHead className="text-right">Channels</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPerformers.map((perf, idx) => (
                  <TableRow key={perf.user.id}>
                    <TableCell>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 font-bold text-sm">
                        {idx + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 avatar-liquid">
                          <AvatarFallback>{perf.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{perf.user.name}</p>
                          <p className="text-xs text-muted">{perf.user.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="badge-success">{perf.completedThisMonth}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="badge-primary">{perf.stageCompletions}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm">{perf.avgCompletionTime}d</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={perf.efficiencyScore >= 80 ? "badge-success" : perf.efficiencyScore >= 60 ? "badge-warning" : "badge-neutral"}>
                        {perf.efficiencyScore}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="badge-neutral">{perf.assignedChannels}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 4️⃣ CHANNEL PERFORMANCE WIDGET */}
        <div className="glass-card p-6 md:p-8 fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="icon-btn-liquid">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">Channel Performance</h2>
            </div>
            <Button 
              onClick={() => navigate('/channels')}
              className="btn-secondary-liquid"
            >
              View All Channels
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {channelPerformance.map((cp, idx) => (
              <Card 
                key={cp.channel.id} 
                className="glass-card p-5 hover:scale-[1.02] transition-transform cursor-pointer"
                onClick={() => navigate(`/channels/${cp.channel.id}`)}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold mb-1 truncate">{cp.channel.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Users className="h-3 w-3" />
                      <span>{cp.teamMembers} members</span>
                    </div>
                  </div>
                  <Badge className="badge-success text-xs">{cp.completionRate}%</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <p className="text-xs text-muted mb-1">Active</p>
                    <p className="text-xl font-bold">{cp.activeTasks}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <p className="text-xs text-muted mb-1">This Week</p>
                    <p className="text-xl font-bold text-green-400">{cp.completedThisWeek}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Avg Time</span>
                    <span className="font-semibold">{cp.avgTime}d</span>
                  </div>
                  <div className="progress-bar-liquid">
                    <div className="progress-fill-liquid" style={{ width: `${cp.completionRate}%` }} />
                  </div>
                </div>

                {cp.manager && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-muted">Manager: <span className="text-white font-semibold">{cp.manager.name}</span></p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* 5️⃣ QUICK INSIGHT CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Distribution */}
          <div className="glass-card p-6 md:p-8 fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-btn-liquid">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold">Task Distribution by Channel</h2>
            </div>

            {taskDistribution.length > 0 ? (
              <div className="space-y-4">
                {taskDistribution.map((dist, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{dist.channel}</span>
                      <span className="text-muted">{dist.percentage}% ({dist.count} tasks)</span>
                    </div>
                    <div className="progress-bar-liquid">
                      <div 
                        className="progress-fill-liquid" 
                        style={{ width: `${dist.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No completed tasks this month</p>
              </div>
            )}
          </div>

          {/* Weekly Trend */}
          <div className="glass-card p-6 md:p-8 fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-btn-liquid">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold">Weekly Trend</h2>
            </div>

            <div className="flex items-end gap-3 h-48">
              {dailyCompletions.map((day, idx) => {
                const maxCount = Math.max(...dailyCompletions.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                    <div className="w-full flex flex-col gap-1">
                      <div 
                        className="w-full rounded-t-lg bg-gradient-to-t from-green-500/60 to-green-500/30"
                        style={{ height: `${Math.max(height * 0.6, 5)}px` }}
                      />
                      <div 
                        className="w-full rounded-t-lg bg-gradient-to-t from-purple-500/60 to-purple-500/30"
                        style={{ height: `${Math.max(height * 0.4, 5)}px` }}
                      />
                    </div>
                    <p className="text-xs text-muted mt-3">{day.day}</p>
                    <p className="text-xs font-bold text-white">{day.count}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500 to-green-400" />
                <span className="text-xs text-muted">Stage Completions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-500 to-purple-400" />
                <span className="text-xs text-muted">Finalized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Download, TrendingUp, Clock, CheckCircle2, User, BarChart3, 
  Users, Video, PlayCircle, Activity, AlertCircle, Calendar, Target,
  Zap, Award, TrendingDown, Filter, FileText, DollarSign
} from 'lucide-react';
import { 
  startOfMonth, endOfMonth, isPast, isFuture, isToday, format, 
  differenceInDays, isAfter, subDays, subMonths, startOfDay, eachDayOfInterval
} from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function OwnerAnalyticsPage() {
  const { user } = useAuth();
  const { tasks, channels, users, stageEvents, completedTasks: completedTasksData } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'channel' | 'user'>('all');
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Filter tasks and events based on date range
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const inDateRange = (!dateRange?.from || t.createdAt >= dateRange.from) &&
                         (!dateRange?.to || t.createdAt <= dateRange.to);
      const matchesChannel = !selectedChannelId || t.channelId === selectedChannelId;
      const matchesUser = !selectedUserId || t.assignedTo === selectedUserId;
      return inDateRange && matchesChannel && matchesUser;
    });
  }, [tasks, dateRange, selectedChannelId, selectedUserId]);

  // Filter completed tasks separately
  const filteredCompletedTasks = useMemo(() => {
    return completedTasksData.filter(t => {
      const inDateRange = (!dateRange?.from || t.completedAt >= dateRange.from) &&
                         (!dateRange?.to || t.completedAt <= dateRange.to);
      const matchesChannel = !selectedChannelId || t.channelId === selectedChannelId;
      const matchesUser = !selectedUserId || t.assignedTo === selectedUserId;
      return inDateRange && matchesChannel && matchesUser;
    });
  }, [completedTasksData, dateRange, selectedChannelId, selectedUserId]);

  const filteredStageEvents = useMemo(() => {
    return stageEvents.filter(e => {
      const inDateRange = (!dateRange?.from || e.occurredAt >= dateRange.from) &&
                         (!dateRange?.to || e.occurredAt <= dateRange.to);
      const matchesChannel = !selectedChannelId || e.channelId === selectedChannelId;
      const matchesUser = !selectedUserId || e.actorUserId === selectedUserId;
      return inDateRange && matchesChannel && matchesUser;
    });
  }, [stageEvents, dateRange, selectedChannelId, selectedUserId]);

  // Core metrics
  const activeTasks = filteredTasks.filter(t => !t.completed);
  const completedTasks = filteredCompletedTasks;
  const completedThisMonth = completedTasks.filter(t => 
    t.completedAt >= startOfMonth(new Date()) && t.completedAt <= endOfMonth(new Date())
  );
  const stageCompletions = filteredStageEvents.filter(e => e.eventType === 'stage_completed');

  // Average completion time
  const avgCompletionTime = useMemo(() => {
    if (completedTasks.length === 0) return 0;
    const totalDays = completedTasks.reduce((sum, task) => {
      const originalTask = tasks.find(t => t.id === task.taskId);
      if (!originalTask) return sum;
      return sum + differenceInDays(task.completedAt, originalTask.createdAt);
    }, 0);
    return (totalDays / completedTasks.length).toFixed(1);
  }, [completedTasks, tasks]);

  // Channel performance metrics
  const channelMetrics = useMemo(() => {
    return channels.map(channel => {
      const channelTasks = filteredTasks.filter(t => t.channelId === channel.id);
      const channelCompleted = filteredCompletedTasks.filter(t => t.channelId === channel.id);
      const channelStageEvents = filteredStageEvents.filter(e => e.channelId === channel.id);
      const channelStageCompletions = channelStageEvents.filter(e => e.eventType === 'stage_completed');
      
      const avgTime = channelCompleted.length > 0
        ? channelCompleted.reduce((sum, t) => {
            const originalTask = tasks.find(ot => ot.id === t.taskId);
            if (!originalTask) return sum;
            return sum + differenceInDays(t.completedAt, originalTask.createdAt);
          }, 0) / channelCompleted.length
        : 0;

      const totalChannelTasks = channelTasks.length + channelCompleted.length;
      const completionRatio = totalChannelTasks > 0
        ? ((channelCompleted.length / totalChannelTasks) * 100).toFixed(0)
        : 0;

      const productivityIndex = totalChannelTasks > 0
        ? ((channelStageCompletions.length / totalChannelTasks) * 100).toFixed(0)
        : 0;

      // Last 7 days activity
      const last7Days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date()
      });
      const dailyActivity = last7Days.map(day => {
        return channelCompleted.filter(t => 
          startOfDay(t.completedAt).getTime() === startOfDay(day).getTime()
        ).length;
      });

      const manager = users.find(u => u.id === channel.managerId);
      const teamCount = channel.members.length;

      return {
        channel,
        totalTasks: totalChannelTasks,
        completedTasks: channelCompleted.length,
        completedThisMonth: channelCompleted.filter(t => 
          t.completedAt >= startOfMonth(new Date()) && t.completedAt <= endOfMonth(new Date())
        ).length,
        avgCompletionTime: avgTime.toFixed(1),
        stageCompletions: channelStageCompletions.length,
        completionRatio,
        productivityIndex,
        dailyActivity,
        manager,
        teamCount
      };
    }).sort((a, b) => Number(b.productivityIndex) - Number(a.productivityIndex));
  }, [channels, filteredTasks, filteredCompletedTasks, filteredStageEvents, users, tasks]);

  // Employee productivity leaderboard
  const employeeLeaderboard = useMemo(() => {
    return users
      .filter(u => u.role !== 'owner')
      .map(user => {
        const userTasks = filteredTasks.filter(t => t.assignedTo === user.id);
        const userCompleted = filteredCompletedTasks.filter(t => t.assignedTo === user.id);
        const userCompletedThisMonth = userCompleted.filter(t => 
          t.completedAt >= startOfMonth(new Date()) && t.completedAt <= endOfMonth(new Date())
        );
        const userStageCompletions = filteredStageEvents.filter(e => 
          e.actorUserId === user.id && e.eventType === 'stage_completed'
        );
        
        const avgTime = userCompleted.length > 0
          ? userCompleted.reduce((sum, t) => {
              const originalTask = tasks.find(ot => ot.id === t.taskId);
              if (!originalTask) return sum;
              return sum + differenceInDays(t.completedAt, originalTask.createdAt);
            }, 0) / userCompleted.length
          : 0;

        const assignedChannels = channels.filter(c => c.members.includes(user.id));

        return {
          user,
          completedThisMonth: userCompletedThisMonth.length,
          stageCompletions: userStageCompletions.length,
          avgTaskTime: avgTime.toFixed(1),
          assignedChannels: assignedChannels.length,
          totalScore: userCompletedThisMonth.length + userStageCompletions.length
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [users, filteredTasks, filteredCompletedTasks, filteredStageEvents, channels, tasks]);

  // Channel contribution breakdown (for pie chart data)
  const channelContribution = useMemo(() => {
    const total = completedTasks.length;
    if (total === 0) return [];
    
    return channels.map(channel => {
      const channelCompleted = completedTasks.filter(t => t.channelId === channel.id).length;
      const percentage = ((channelCompleted / total) * 100).toFixed(1);
      return {
        channel: channel.name,
        count: channelCompleted,
        percentage
      };
    }).filter(c => c.count > 0);
  }, [channels, completedTasks]);

  // Monthly trend data (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(subMonths(new Date(), i));
      
      const monthStageCompletions = stageEvents.filter(e => 
        e.eventType === 'stage_completed' &&
        e.occurredAt >= monthStart &&
        e.occurredAt <= monthEnd
      ).length;

      const monthFinalized = stageEvents.filter(e => 
        e.eventType === 'finalized' &&
        e.occurredAt >= monthStart &&
        e.occurredAt <= monthEnd
      ).length;

      const monthActive = tasks.filter(t => 
        !t.completed &&
        t.createdAt >= monthStart &&
        t.createdAt <= monthEnd
      ).length;

      months.push({
        month: format(monthStart, 'MMM'),
        stageCompletions: monthStageCompletions,
        finalized: monthFinalized,
        active: monthActive
      });
    }
    return months;
  }, [tasks, stageEvents]);

  // Alerts and health checks
  const alerts = useMemo(() => {
    const alertList = [];
    
    // Low activity channels
    channelMetrics.forEach(cm => {
      if (cm.completedThisMonth === 0 && cm.totalTasks > 0) {
        alertList.push({
          type: 'warning',
          message: `${cm.channel.name} has no completed tasks this month`,
          icon: AlertCircle
        });
      }
    });

    // Employees with no activity
    employeeLeaderboard.forEach(emp => {
      if (emp.completedThisMonth === 0 && emp.stageCompletions === 0) {
        alertList.push({
          type: 'warning',
          message: `${emp.user.name} has no activity in the last 7 days`,
          icon: User
        });
      }
    });

    // Overdue tasks
    const overdueTasks = activeTasks.filter(t => t.dueDate && isPast(t.dueDate));
    if (overdueTasks.length > 5) {
      alertList.push({
        type: 'danger',
        message: `${overdueTasks.length} tasks are overdue`,
        icon: Clock
      });
    }

    return alertList.slice(0, 5);
  }, [channelMetrics, employeeLeaderboard, activeTasks]);

  // Export functionality
  const handleExport = () => {
    const csvData = employeeLeaderboard.map(({ user, completedThisMonth, stageCompletions, avgTaskTime, assignedChannels }) => ({
      name: user.name,
      role: user.role,
      completed_this_month: completedThisMonth,
      stage_completions: stageCompletions,
      avg_task_time: avgTaskTime,
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
    a.download = `command-center-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "Analytics data exported to CSV.",
    });
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="max-w-[1800px] mx-auto mb-6">
        <div className="glass-card p-6 md:p-8 fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="icon-btn-liquid">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-1 gradient-text">Command Center</h1>
                <p className="text-body text-sm md:text-base">360° Business Intelligence Dashboard</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={selectedFilter} onValueChange={(v: any) => {
                setSelectedFilter(v);
                if (v === 'all') {
                  setSelectedChannelId(null);
                  setSelectedUserId(null);
                }
              }}>
                <SelectTrigger className="w-32 input-liquid h-10">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="modal-liquid">
                  <SelectItem value="all">All Data</SelectItem>
                  <SelectItem value="channel">By Channel</SelectItem>
                  <SelectItem value="user">By User</SelectItem>
                </SelectContent>
              </Select>

              {selectedFilter === 'channel' && (
                <Select value={selectedChannelId || ''} onValueChange={setSelectedChannelId}>
                  <SelectTrigger className="w-40 input-liquid h-10">
                    <SelectValue placeholder="Select Channel" />
                  </SelectTrigger>
                  <SelectContent className="modal-liquid">
                    {channels.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedFilter === 'user' && (
                <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-40 input-liquid h-10">
                    <SelectValue placeholder="Select User" />
                  </SelectTrigger>
                  <SelectContent className="modal-liquid">
                    {users.filter(u => u.role !== 'owner').map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button onClick={handleExport} className="btn-secondary-liquid">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* 1️⃣ OVERVIEW BAR - Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 md:gap-4">
          <Card className="stat-card-liquid card-purple fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-purple-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Channels</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white">{channels.length}</p>
          </Card>

          <Card className="stat-card-liquid card-blue fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-cyan-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Team</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white">{users.filter(u => u.role !== 'owner').length}</p>
          </Card>

          <Card className="stat-card-liquid card-green fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Completed</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white">{completedTasks.length}</p>
          </Card>

          <Card className="stat-card-liquid card-cyan fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-cyan-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">This Month</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white">{completedThisMonth.length}</p>
          </Card>

          <Card className="stat-card-liquid card-orange fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-orange-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Active</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white">{activeTasks.length}</p>
          </Card>

          <Card className="stat-card-liquid card-pink fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-pink-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Avg Time</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{avgCompletionTime}d</p>
          </Card>

          <Card className="stat-card-liquid card-green fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-green-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Stages</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white">{stageCompletions.length}</p>
          </Card>

          <Card className="stat-card-liquid card-cyan fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.35s' }}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-cyan-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Revenue</p>
            </div>
            <p className="text-xl md:text-2xl font-bold text-white">TBD</p>
          </Card>
        </div>

        {/* Alerts Panel */}
        {alerts.length > 0 && (
          <div className="glass-card p-6 fade-in border-l-4 border-orange-500">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-orange-400" />
              <h3 className="text-lg font-bold">System Alerts</h3>
            </div>
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <alert.icon className={`h-4 w-4 ${alert.type === 'danger' ? 'text-red-400' : 'text-orange-400'}`} />
                  <Badge className={`${alert.type === 'danger' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'} text-xs`}>
                    {alert.type === 'danger' ? '🔴 Critical' : '🟡 Warning'}
                  </Badge>
                  <p className="text-sm text-body flex-1">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2️⃣ CHANNEL PERFORMANCE SECTION */}
        <div className="glass-card p-6 md:p-8 fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="icon-btn-liquid">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">Channel Performance</h2>
            </div>
            <Badge className="badge-primary">
              {channelMetrics.length} Active Channels
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {channelMetrics.map((cm, idx) => (
              <Card key={cm.channel.id} className="glass-card p-5 hover:scale-[1.02] transition-transform cursor-pointer" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1 truncate">{cm.channel.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <User className="h-3 w-3" />
                      <span>{cm.manager?.name || 'No Manager'}</span>
                      <span className="text-white/40">•</span>
                      <Users className="h-3 w-3" />
                      <span>{cm.teamCount} members</span>
                    </div>
                  </div>
                  <Badge className="badge-success text-xs">
                    {cm.productivityIndex}% PI
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-xs text-muted mb-1">Total Tasks</p>
                    <p className="text-2xl font-bold">{cm.totalTasks}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-xs text-muted mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-400">{cm.completedThisMonth}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-xs text-muted mb-1">Avg Time</p>
                    <p className="text-xl font-bold">{cm.avgCompletionTime}d</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-xs text-muted mb-1">Stages</p>
                    <p className="text-2xl font-bold text-purple-400">{cm.stageCompletions}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted mb-2">
                    <span>Completion Rate</span>
                    <span>{cm.completionRatio}%</span>
                  </div>
                  <div className="progress-bar-liquid">
                    <div className="progress-fill-liquid" style={{ width: `${cm.completionRatio}%` }} />
                  </div>
                  {/* Accent glow bar */}
                  <div className="h-1 mt-1 rounded-full bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-pink-500/40 blur-sm" style={{ width: `${cm.completionRatio}%` }} />
                </div>

                {/* Mini sparkline */}
                <div className="flex items-end gap-1 h-12">
                  {cm.dailyActivity.map((count, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-gradient-to-t from-purple-500/40 to-pink-500/40 rounded-t transition-all hover:opacity-80"
                      style={{ height: `${Math.max((count / Math.max(...cm.dailyActivity, 1)) * 100, 5)}%` }}
                    />
                  ))}
                </div>

                <Button 
                  onClick={() => navigate(`/channels/${cm.channel.id}`)}
                  className="w-full btn-secondary-liquid text-sm"
                >
                  Open Channel Analytics
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* 3️⃣ DEEP INSIGHTS & TRENDS SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Employee Productivity Leaderboard */}
          <div className="glass-card p-6 md:p-8 fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-btn-liquid">
                <Award className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold">Team Leaderboard</h2>
            </div>

            <div className="space-y-3">
              {employeeLeaderboard.slice(0, 10).map((emp, idx) => (
                <div key={emp.user.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <Avatar className="h-10 w-10 avatar-liquid">
                    <AvatarFallback>{emp.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{emp.user.name}</p>
                    <p className="text-xs text-muted">{emp.user.role.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">{emp.completedThisMonth} tasks</p>
                    <p className="text-xs text-muted">{emp.stageCompletions} stages</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Channel Contribution Breakdown */}
          <div className="glass-card p-6 md:p-8 fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-btn-liquid">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold">Channel Contribution</h2>
            </div>

            {channelContribution.length > 0 ? (
              <div className="space-y-4">
                {channelContribution.map((cc, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{cc.channel}</span>
                      <span className="text-muted">{cc.percentage}% ({cc.count} tasks)</span>
                    </div>
                    <div className="progress-bar-liquid">
                      <div 
                        className="progress-fill-liquid" 
                        style={{ width: `${cc.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No completed tasks in selected period</p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="glass-card p-6 md:p-8 fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="icon-btn-liquid">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold">6-Month Performance Trend</h2>
          </div>

          <div className="grid grid-cols-6 gap-4">
            {monthlyTrend.map((month, idx) => (
              <div key={idx} className="text-center">
                <p className="text-xs text-muted mb-3 font-semibold">{month.month}</p>
                <div className="flex flex-col gap-2 items-center">
                  <div className="w-full">
                    <div className="h-24 bg-white/5 rounded-lg relative overflow-hidden border border-white/10">
                      <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-green-500/60 to-green-500/30 rounded-t"
                        style={{ height: `${(month.stageCompletions / Math.max(...monthlyTrend.map(m => m.stageCompletions), 1)) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-green-400 mt-1 font-semibold">{month.stageCompletions}</p>
                    <p className="text-[10px] text-muted">Stages</p>
                  </div>
                  <div className="w-full">
                    <div className="h-24 bg-white/5 rounded-lg relative overflow-hidden border border-white/10">
                      <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-purple-500/60 to-purple-500/30 rounded-t"
                        style={{ height: `${(month.finalized / Math.max(...monthlyTrend.map(m => m.finalized), 1)) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-purple-400 mt-1 font-semibold">{month.finalized}</p>
                    <p className="text-[10px] text-muted">Videos</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Team Performance Table */}
        <div className="glass-card p-6 md:p-8 fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="icon-btn-liquid">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold">Detailed Team Performance</h2>
          </div>

          <div className="overflow-x-auto">
            <Table className="table-liquid">
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Completed (Month)</TableHead>
                  <TableHead className="text-right">Stage Completions</TableHead>
                  <TableHead className="text-right">Avg Task Time</TableHead>
                  <TableHead className="text-right">Channels</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeLeaderboard.map((emp) => (
                  <TableRow key={emp.user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 avatar-liquid">
                          <AvatarFallback>{emp.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{emp.user.name}</p>
                          <p className="text-xs text-muted">{emp.user.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="badge-success">{emp.completedThisMonth}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="badge-primary">{emp.stageCompletions}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm">{emp.avgTaskTime}d</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="badge-neutral">{emp.assignedChannels}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
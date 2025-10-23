import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, ArrowRight, CheckCircle2, AlertCircle, Clock, TrendingUp, TrendingDown,
  Activity, Users, Zap, BarChart3, PlayCircle, Target, Calendar, Briefcase, Download
} from 'lucide-react';
import { Channel } from '@/types';
import { isToday, isPast, isFuture, subDays, addDays, format, startOfWeek, endOfWeek, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

interface ChannelManagerDashboardProps {
  selectedChannel?: Channel | null;
  onChannelSelect?: (channel: Channel | null) => void;
}

export default function ChannelManagerDashboard({ selectedChannel, onChannelSelect }: ChannelManagerDashboardProps) {
  const { user } = useAuth();
  const { channels, tasks, users, completedTasks: completedTasksData, stageEvents, otEntries } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('week');

  const managedChannels = channels.filter(c => c.managerId === user?.id && !c.archived);
  const managedChannelIds = managedChannels.map(c => c.id);
  const scopedTasks = tasks.filter(t => managedChannelIds.includes(t.channelId));

  // Date ranges
  const now = new Date();
  const last7Days = subDays(now, 7);
  const last30Days = subDays(now, 30);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  // Core metrics
  const activeTasks = scopedTasks.filter(t => !t.completed);
  const overdueTasks = activeTasks.filter(t => t.dueDate && isPast(t.dueDate));
  const completedLast7Days = completedTasksData.filter(t => 
    managedChannelIds.includes(t.channelId) && t.completedAt >= last7Days
  );
  const stageCompletionsWeek = stageEvents.filter(e => 
    e.eventType === 'stage_completed' && 
    managedChannelIds.includes(e.channelId) &&
    e.occurredAt >= weekStart && e.occurredAt <= weekEnd
  );

  // Average completion time
  const avgCompletionTime = useMemo(() => {
    if (completedLast7Days.length === 0) return 0;
    const totalDays = completedLast7Days.reduce((sum, ct) => {
      const originalTask = tasks.find(t => t.id === ct.taskId);
      if (!originalTask) return sum;
      return sum + differenceInDays(ct.completedAt, originalTask.createdAt);
    }, 0);
    return (totalDays / completedLast7Days.length).toFixed(1);
  }, [completedLast7Days, tasks]);

  // Trend calculations
  const last14Days = subDays(now, 14);
  const completedPrevious7Days = completedTasksData.filter(t => 
    managedChannelIds.includes(t.channelId) && 
    t.completedAt >= last14Days && 
    t.completedAt < last7Days
  );
  const completedTrend = completedLast7Days.length - completedPrevious7Days.length;
  const overdueTrend = 0; // Would need historical data

  // Tasks due next 7 days
  const dueNext7Days = useMemo(() => {
    const data: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(now, i);
      const count = activeTasks.filter(t => 
        t.dueDate && format(t.dueDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length;
      data.push({ date: format(date, 'EEE'), count });
    }
    return data;
  }, [activeTasks, now]);

  // Throughput data
  const throughputData = useMemo(() => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const count = completedTasksData.filter(t => 
        managedChannelIds.includes(t.channelId) &&
        format(t.completedAt, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length;
      data.push(count);
    }
    return data;
  }, [completedTasksData, managedChannelIds, now]);

  const avgThroughput = (throughputData.reduce((a, b) => a + b, 0) / 7).toFixed(1);

  // Channel performance
  const channelPerformance = useMemo(() => {
    return managedChannels.map(channel => {
      const channelTasks = activeTasks.filter(t => t.channelId === channel.id);
      const channelCompleted = completedLast7Days.filter(t => t.channelId === channel.id);
      const channelOverdue = channelTasks.filter(t => t.dueDate && isPast(t.dueDate));
      
      const avgTime = channelCompleted.length > 0
        ? channelCompleted.reduce((sum, ct) => {
            const originalTask = tasks.find(t => t.id === ct.taskId);
            if (!originalTask) return sum;
            return sum + differenceInDays(ct.completedAt, originalTask.createdAt);
          }, 0) / channelCompleted.length
        : 0;

      const totalTasks = channelTasks.length + channelCompleted.length;
      const completionRate = totalTasks > 0 
        ? Math.round((channelCompleted.length / totalTasks) * 100) 
        : 0;

      return {
        channel,
        activeTasks: channelTasks.length,
        completedWeek: channelCompleted.length,
        overdue: channelOverdue.length,
        avgTime: avgTime.toFixed(1),
        completionRate,
        teamMembers: channel.members.length
      };
    }).sort((a, b) => b.completedWeek - a.completedWeek);
  }, [managedChannels, activeTasks, completedLast7Days, tasks]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return stageEvents
      .filter(e => managedChannelIds.includes(e.channelId))
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, 10)
      .map(event => {
        const user = users.find(u => u.id === event.actorUserId);
        const channel = channels.find(c => c.id === event.channelId);
        let message = '';
        if (event.eventType === 'stage_completed') {
          message = `moved a task to ${event.toStage}`;
        }
        return { user, channel, message, timestamp: event.occurredAt, type: event.eventType };
      });
  }, [stageEvents, managedChannelIds, users, channels]);

  // Filter channels
  const filteredChannels = managedChannels.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const maxDue = Math.max(...dueNext7Days.map(d => d.count), 1);
  const maxThroughput = Math.max(...throughputData, 1);

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
              <h1 className="text-3xl md:text-4xl font-bold mb-1 gradient-text">Channel Operations Dashboard</h1>
              <p className="text-body text-sm md:text-base">Daily performance tracking • Welcome back, {user?.name}</p>
            </div>
            <div className="flex gap-3 items-center">
              <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
                <SelectTrigger className="w-32 input-liquid h-10">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="modal-liquid">
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-body" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-10 input-liquid h-10 w-48"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* 1️⃣ TOP METRIC BAR */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <Card className="stat-card-liquid card-purple fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-purple-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Channels</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{managedChannels.length}</p>
            <p className="text-xs text-white/60">active</p>
          </Card>

          <Card className="stat-card-liquid card-cyan fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-cyan-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">In Progress</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{activeTasks.length}</p>
            <p className="text-xs text-white/60">tasks</p>
          </Card>

          <Card className="stat-card-liquid card-green fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Completed</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{completedLast7Days.length}</p>
            <TrendIndicator value={completedTrend} />
          </Card>

          <Card className="stat-card-liquid card-red fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Overdue</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{overdueTasks.length}</p>
            <p className="text-xs text-white/60">{activeTasks.length > 0 ? Math.round((overdueTasks.length / activeTasks.length) * 100) : 0}% of total</p>
          </Card>

          <Card className="stat-card-liquid card-pink fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-pink-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Avg Time</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white mb-1">{avgCompletionTime}d</p>
            <p className="text-xs text-white/60">completion</p>
          </Card>

          <Card className="stat-card-liquid card-orange fade-in p-4 md:p-5 cursor-pointer hover:scale-105 transition-transform" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-orange-300" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Stages</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stageCompletionsWeek.length}</p>
            <p className="text-xs text-white/60">this week</p>
          </Card>
        </div>

        {/* 2️⃣ WEEKLY OVERVIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 md:p-8 fade-in lg:col-span-2">
            <h3 className="text-xl font-bold mb-6">Weekly Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Tasks Due Next 7 Days */}
              <div>
                <p className="text-sm text-muted mb-3 font-semibold">Tasks Due Next 7 Days</p>
                <div className="flex items-end gap-2 h-32">
                  {dueNext7Days.map((day, idx) => {
                    const height = (day.count / maxDue) * 100;
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
                <div className="text-center pt-4 border-t border-white/10 mt-4">
                  <span className="text-2xl font-bold gradient-text">
                    {dueNext7Days.reduce((sum, d) => sum + d.count, 0)}
                  </span>
                  <span className="text-body ml-2 text-sm">total tasks</span>
                </div>
              </div>

              {/* Throughput Rate */}
              <div>
                <p className="text-sm text-muted mb-3 font-semibold">Throughput Rate (7 days)</p>
                <div className="flex items-end gap-2 h-32">
                  {throughputData.map((count, idx) => {
                    const height = (count / maxThroughput) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                        <div 
                          className="w-full rounded-t-lg bg-gradient-to-t from-green-500/60 to-green-500/30 transition-all hover:opacity-80"
                          style={{ height: `${Math.max(height, 5)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="text-center pt-4 border-t border-white/10 mt-4">
                  <span className="text-2xl font-bold gradient-text">{avgThroughput}</span>
                  <span className="text-body ml-2 text-sm">avg/day</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4️⃣ TEAM ACTIVITY FEED */}
          <div className="glass-card p-6 fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-btn-liquid">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold">Team Activity</h3>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <Avatar className="h-8 w-8 avatar-liquid flex-shrink-0">
                    <AvatarFallback>{activity.user?.name.split(' ').map(n => n[0]).join('') || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-body">
                      <span className="font-semibold text-white">{activity.user?.name || 'Unknown'}</span> {activity.message}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {activity.channel?.name} • {format(activity.timestamp, 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3️⃣ CHANNEL GRID SECTION */}
        <div className="glass-card p-6 md:p-8 fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="icon-btn-liquid">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">My Channels</h2>
            </div>
            <Button 
              onClick={() => navigate('/channels')}
              className="btn-secondary-liquid"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {filteredChannels.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>{searchQuery ? 'No channels found' : 'No channels assigned yet'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channelPerformance.map((cp, idx) => (
                <Card 
                  key={cp.channel.id} 
                  className="glass-card p-5 hover:scale-[1.02] transition-transform cursor-pointer"
                  onClick={() => onChannelSelect?.(cp.channel)}
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

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                      <p className="text-xs text-muted mb-1">Active</p>
                      <p className="text-xl font-bold">{cp.activeTasks}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                      <p className="text-xs text-muted mb-1">Done</p>
                      <p className="text-xl font-bold text-green-400">{cp.completedWeek}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                      <p className="text-xs text-muted mb-1">Late</p>
                      <p className="text-xl font-bold text-red-400">{cp.overdue}</p>
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

                  <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                    <Button 
                      size="sm" 
                      className="btn-primary-liquid flex-1 h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/channels/${cp.channel.id}`);
                      }}
                    >
                      Open Board
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="btn-secondary-liquid flex-1 h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/manager-analytics');
                      }}
                    >
                      Analytics
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 🆕 OT ANALYTICS FOR MANAGER */}
        <div className="glass-card p-6 md:p-8 fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="icon-btn-liquid">
                <Briefcase className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">OT Insights (My Channels)</h2>
            </div>
            <Button 
              onClick={() => {
                const monthStart = startOfMonth(new Date());
                const monthEnd = endOfMonth(new Date());
                const otData = otEntries.filter(e => 
                  managedChannelIds.includes(e.channelId) &&
                  e.date >= monthStart && 
                  e.date <= monthEnd
                ).map(entry => {
                  const user = users.find(u => u.id === entry.userId);
                  const channel = channels.find(c => c.id === entry.channelId);
                  return {
                    date: format(entry.date, 'yyyy-MM-dd'),
                    employee: user?.name || 'Unknown',
                    channel: channel?.name || 'N/A',
                    type: entry.type === 'half_day' ? 'Half Day' : 'Full Day',
                    amount: entry.amount,
                    notes: entry.notes || ''
                  };
                });

                const headers = Object.keys(otData[0] || {});
                const csv = [
                  headers.join(','),
                  ...otData.map(row => headers.map(h => `\"${row[h as keyof typeof row]}\"`).join(','))
                ].join('\n');

                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `manager-ot-log-${format(new Date(), 'yyyy-MM')}.csv`;
                a.click();

                toast({
                  title: "Exported",
                  description: "OT log exported to CSV.",
                });
              }}
              className="btn-secondary-liquid"
            >
              <Download className="h-4 w-4 mr-2" />
              Export OT Log
            </Button>
          </div>

          {(() => {
            const monthStart = startOfMonth(new Date());
            const monthEnd = endOfMonth(new Date());
            
            const myChannelsOT = otEntries.filter(e => 
              managedChannelIds.includes(e.channelId) &&
              e.date >= monthStart && 
              e.date <= monthEnd
            );

            const totalOT = myChannelsOT.reduce((sum, e) => sum + e.amount, 0);

            // Top 3 employees with most OT
            const channelMembers = users.filter(u => 
              managedChannels.some(c => c.members.includes(u.id))
            );

            const topOTEmployees = channelMembers
              .map(user => {
                const userOT = myChannelsOT.filter(e => e.userId === user.id);
                const totalAmount = userOT.reduce((sum, e) => sum + e.amount, 0);
                const totalHours = userOT.reduce((sum, e) => sum + (e.type === 'full_day' ? 8 : 4), 0);
                return { user, totalAmount, totalHours, count: userOT.length };
              })
              .filter(e => e.count > 0)
              .sort((a, b) => b.totalHours - a.totalHours)
              .slice(0, 3);

            // OT trend (last 14 days)
            const last14Days = Array.from({ length: 14 }, (_, i) => {
              const date = subDays(now, 13 - i);
              const dayOT = myChannelsOT.filter(e => 
                format(e.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
              );
              return {
                date: format(date, 'MMM d'),
                amount: dayOT.reduce((sum, e) => sum + e.amount, 0)
              };
            });

            // Average OT cost per task
            const completedThisMonth = completedTasksData.filter(t => 
              managedChannelIds.includes(t.channelId) &&
              t.completedAt >= monthStart && 
              t.completedAt <= monthEnd
            );
            const avgOTPerTask = completedThisMonth.length > 0
              ? (totalOT / completedThisMonth.length).toFixed(0)
              : 0;

            // Channel breakdown
            const otByChannel = managedChannels.map(channel => {
              const channelOT = myChannelsOT.filter(e => e.channelId === channel.id);
              const total = channelOT.reduce((sum, e) => sum + e.amount, 0);
              return { name: channel.name, total, count: channelOT.length };
            }).filter(c => c.count > 0).sort((a, b) => b.total - a.total);

            return (
              <>
                {/* OT Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card className="stat-card-liquid card-orange p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4 text-orange-300" />
                      <p className="text-xs text-white/70 font-semibold uppercase">Total OT</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-white">₹{totalOT.toLocaleString()}</p>
                    <p className="text-xs text-white/60">this month</p>
                  </Card>

                  <Card className="stat-card-liquid card-blue p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-300" />
                      <p className="text-xs text-white/70 font-semibold uppercase">Employees</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-white">{topOTEmployees.length}</p>
                    <p className="text-xs text-white/60">claimed OT</p>
                  </Card>

                  <Card className="stat-card-liquid card-purple p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-purple-300" />
                      <p className="text-xs text-white/70 font-semibold uppercase">Avg/Task</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-white">₹{avgOTPerTask}</p>
                  </Card>

                  <Card className="stat-card-liquid card-cyan p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-cyan-300" />
                      <p className="text-xs text-white/70 font-semibold uppercase">Total Hours</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-white">
                      {myChannelsOT.reduce((sum, e) => sum + (e.type === 'full_day' ? 8 : 4), 0)}h
                    </p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top 3 OT Employees */}
                  <div>
                    <h3 className="text-lg font-bold mb-4">Top OT Contributors</h3>
                    {topOTEmployees.length === 0 ? (
                      <div className="text-center py-8 text-muted">
                        <p className="text-sm">No OT entries this month</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {topOTEmployees.map((emp, idx) => (
                          <div key={emp.user.id} className="glass-card p-4 flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/30 to-orange-500/10 font-bold text-sm">
                              {idx + 1}
                            </div>
                            <Avatar className="h-10 w-10 avatar-liquid">
                              <AvatarFallback>{emp.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white text-sm">{emp.user.name}</p>
                              <p className="text-xs text-muted">{emp.totalHours}h • {emp.count} entries</p>
                            </div>
                            <p className="text-lg font-bold gradient-text">₹{emp.totalAmount.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* OT Trend (14 days) */}
                  <div>
                    <h3 className="text-lg font-bold mb-4">OT Trend (Last 14 Days)</h3>
                    <div className="flex items-end gap-1 h-32 mb-4">
                      {last14Days.map((day, idx) => {
                        const maxAmount = Math.max(...last14Days.map(d => d.amount), 1);
                        const height = (day.amount / maxAmount) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative">
                            <div 
                              className="w-full rounded-t bg-gradient-to-t from-orange-500/60 to-orange-500/30 transition-all hover:opacity-80"
                              style={{ height: `${Math.max(height, 3)}%` }}
                            />
                            {day.amount > 0 && (
                              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                ₹{day.amount}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-center">
                      <span className="text-2xl font-bold gradient-text">
                        ₹{(totalOT / 30 * 14).toFixed(0)}
                      </span>
                      <span className="text-body ml-2 text-sm">avg per 14 days</span>
                    </div>
                  </div>
                </div>

                {/* Channel Breakdown */}
                {otByChannel.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-bold mb-4">OT by Channel</h3>
                    <div className="space-y-3">
                      {otByChannel.map((ch, idx) => (
                        <div key={idx} className="glass-card p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-white">{ch.name}</span>
                            <div className="text-right">
                              <p className="text-lg font-bold gradient-text">₹{ch.total.toLocaleString()}</p>
                              <p className="text-xs text-muted">{ch.count} entries</p>
                            </div>
                          </div>
                          <div className="progress-bar-liquid">
                            <div 
                              className="progress-fill-liquid bg-gradient-to-r from-orange-500 to-orange-400" 
                              style={{ width: `${(ch.total / totalOT) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
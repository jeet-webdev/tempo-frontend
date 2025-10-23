import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ArrowRight, CheckCircle2, AlertCircle, Clock, TrendingUp, Ban } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ChannelCard from './ChannelCard';
import { Channel } from '@/types';
import { isToday, isBefore, isAfter, subDays, addDays, format, startOfMonth, endOfMonth, isPast, isFuture } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function ChannelManagerDashboard() {
  const { user } = useAuth();
  const { tasks, channels, users, completedTasks, stageEvents } = useData();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Get channels managed by this user
  const managedChannels = channels.filter(c => c.managerId === user?.id);

  // Filter tasks for managed channels - include tasks without due dates
  const myChannelTasks = tasks.filter(t => 
    managedChannels.some(c => c.id === t.channelId) && !t.completed
  );
  
  const overdueTasks = myChannelTasks.filter(t => t.dueDate && isPast(t.dueDate));
  const todayTasks = myChannelTasks.filter(t => t.dueDate && isToday(t.dueDate));
  const upcomingTasks = myChannelTasks.filter(t => {
    if (!t.dueDate) return true; // Include tasks without due dates
    return isFuture(t.dueDate) && !isToday(t.dueDate);
  });

  // Calculate stage completions and finalized videos for managed channels
  const stageCompletions = stageEvents.filter(e => 
    e.eventType === 'stage_completed' &&
    managedChannels.some(c => c.id === e.channelId) &&
    (!dateRange?.from || e.occurredAt >= dateRange.from) &&
    (!dateRange?.to || e.occurredAt <= dateRange.to)
  );
  
  const finalizedVideos = tasks.filter(t => 
    t.completed &&
    managedChannels.some(c => c.id === t.channelId) &&
    (!dateRange?.from || t.updatedAt >= dateRange.from) &&
    (!dateRange?.to || t.updatedAt <= dateRange.to)
  );

  // Per-channel analytics
  const channelStats = managedChannels.map(channel => {
    const channelStageCompletions = stageCompletions.filter(e => e.channelId === channel.id);
    const channelFinalizedTasks = finalizedVideos.filter(t => t.channelId === channel.id);
    const channelActiveTasks = myChannelTasks.filter(t => t.channelId === channel.id);
    
    return {
      channel,
      stageCompletions: channelStageCompletions.length,
      finalizedVideos: channelFinalizedTasks.length,
      activeTasks: channelActiveTasks.length,
      overdueTasks: channelActiveTasks.filter(t => t.dueDate && isPast(t.dueDate)).length,
    };
  }).sort((a, b) => (b.stageCompletions + b.finalizedVideos) - (a.stageCompletions + a.finalizedVideos));

  // Per-user analytics for team members
  const teamMembers = users.filter(u => 
    u.role !== 'owner' && 
    u.role !== 'channel_manager' &&
    managedChannels.some(c => c.members.includes(u.id))
  );

  const userStats = teamMembers.map(teamUser => {
    const userStageCompletions = stageCompletions.filter(e => e.actorUserId === teamUser.id);
    const userFinalizedTasks = finalizedVideos.filter(t => t.assignedTo === teamUser.id);
    const userActiveTasks = myChannelTasks.filter(t => t.assignedTo === teamUser.id);
    
    return {
      user: teamUser,
      stageCompletions: userStageCompletions.length,
      finalizedVideos: userFinalizedTasks.length,
      activeTasks: userActiveTasks.length,
      overdueTasks: userActiveTasks.filter(t => t.dueDate && isPast(t.dueDate)).length,
    };
  }).sort((a, b) => (b.stageCompletions + b.finalizedVideos) - (a.stageCompletions + a.finalizedVideos));

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'newest' | 'active'>('name');

  // KPI Calculations (scoped to managed channels)
  const kpis = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);

    const tasksToday = myChannelTasks.filter(t => t.dueDate && isToday(t.dueDate) && !t.completed).length;
    const overdue = myChannelTasks.filter(t => t.dueDate && isBefore(t.dueDate, today) && !t.completed).length;
    const inProgress = myChannelTasks.filter(t => !t.completed).length;
    const completedLast7Days = myChannelTasks.filter(t => t.completed && t.updatedAt && isAfter(t.updatedAt, sevenDaysAgo)).length;
    const blocked = 0;

    return { tasksToday, overdue, inProgress, completedLast7Days, blocked };
  }, [myChannelTasks]);

  // Mini trends - Due Next 7 Days
  const dueNext7Days = useMemo(() => {
    const data: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(new Date(), i);
      const count = myChannelTasks.filter(t => 
        t.dueDate && 
        format(t.dueDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') && 
        !t.completed
      ).length;
      data.push({ date: format(date, 'MMM d'), count });
    }
    return data;
  }, [myChannelTasks]);

  // Throughput sparkline
  const throughputData = useMemo(() => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const count = myChannelTasks.filter(t => 
        t.completed && 
        t.updatedAt && 
        format(t.updatedAt, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length;
      data.push(count);
    }
    const avg = data.reduce((a, b) => a + b, 0) / 7;
    return { data, avg: avg.toFixed(1) };
  }, [myChannelTasks]);

  // Filter and sort channels
  const filteredChannels = useMemo(() => {
    let filtered = managedChannels.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'active':
        filtered.sort((a, b) => {
          const aCount = myChannelTasks.filter(t => t.channelId === a.id && !t.completed).length;
          const bCount = myChannelTasks.filter(t => t.channelId === b.id && !t.completed).length;
          return bCount - aCount;
        });
        break;
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [managedChannels, searchQuery, sortBy, myChannelTasks]);

  const maxDue = Math.max(...dueNext7Days.map(d => d.count), 1);
  const maxThroughput = Math.max(...throughputData.data, 1);

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="glass-card p-8 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
              <p className="text-body text-lg">Welcome back, {user?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="stat-card-liquid card-blue fade-in">
            <p className="text-label mb-2">Active Tasks</p>
            <p className="text-4xl font-bold text-white mb-1">{myChannelTasks.length}</p>
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

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="stat-card-liquid fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-btn-liquid">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-label">Tasks Today</p>
            </div>
            <div className="text-4xl font-bold gradient-text mb-2">{kpis.tasksToday}</div>
            <p className="text-muted">Across {managedChannels.length} channels</p>
          </div>

          <div className="stat-card-liquid card-pink fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-btn-liquid">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="text-label">Overdue</p>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{kpis.overdue}</div>
            <p className="text-muted">Needs attention</p>
          </div>

          <div className="stat-card-liquid card-cyan fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-btn-liquid">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-label">In Progress</p>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{kpis.inProgress}</div>
            <p className="text-muted">Active tasks</p>
          </div>

          <div className="stat-card-liquid card-green fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-btn-liquid">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-label">Completed (7d)</p>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{kpis.completedLast7Days}</div>
            <p className="text-muted">Last week</p>
          </div>

          <div className="stat-card-liquid card-orange fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-btn-liquid">
                <Ban className="h-5 w-5" />
              </div>
              <p className="text-label">Blocked</p>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{kpis.blocked}</div>
            <p className="text-muted">Waiting</p>
          </div>
        </div>

        {/* Mini Trends */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card p-8 fade-in">
            <h3 className="text-xl font-bold mb-6">Due Next 7 Days</h3>
            <div className="flex items-end gap-3 h-40 mb-6">
              {dueNext7Days.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end">
                  <div 
                    className="w-full rounded-t-xl transition-all hover:opacity-80"
                    style={{ 
                      height: `${(d.count / maxDue) * 120}px`,
                      minHeight: '8px',
                      background: 'linear-gradient(180deg, #a855f7, #ec4899)',
                      boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)'
                    }}
                  />
                  <div className="text-sm text-muted mt-3 font-medium">{d.date.split(' ')[1]}</div>
                </div>
              ))}
            </div>
            <div className="text-center pt-6 border-t border-white/10">
              <span className="text-3xl font-bold gradient-text">
                {dueNext7Days.reduce((sum, d) => sum + d.count, 0)}
              </span>
              <span className="text-body ml-3">total tasks</span>
            </div>
          </div>

          <div className="glass-card p-8 fade-in">
            <h3 className="text-xl font-bold mb-6">Throughput (7d)</h3>
            <div className="flex items-end gap-2 h-40 mb-6">
              {throughputData.data.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end">
                  <div 
                    className="w-full rounded-t-xl transition-all hover:opacity-80"
                    style={{ 
                      height: `${(count / maxThroughput) * 120}px`,
                      minHeight: '8px',
                      background: 'linear-gradient(180deg, #22c55e, #86efac)',
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="text-center pt-6 border-t border-white/10">
              <span className="text-3xl font-bold gradient-text">{throughputData.avg}</span>
              <span className="text-body ml-3">avg/day</span>
            </div>
          </div>
        </div>

        {/* Channels Section */}
        <div className="glass-card p-8 fade-in">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                My Channels ({filteredChannels.length} total)
              </h2>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/channels')}
              className="btn-secondary-liquid"
            >
              View full Channels page
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>

          {/* Controls */}
          <div className="flex gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-body" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels..."
                className="pl-12 input-liquid h-12"
              />
            </div>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-48 input-liquid h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="modal-liquid">
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="newest">Sort by Newest</SelectItem>
                <SelectItem value="active">Sort by Most Active</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Channel Grid */}
          {filteredChannels.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <p className="text-xl">{searchQuery ? 'No channels found' : 'No channels assigned yet'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredChannels.map((channel) => (
                <ChannelCard 
                  key={channel.id} 
                  channel={channel}
                  onClick={() => setSelectedChannel(channel.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
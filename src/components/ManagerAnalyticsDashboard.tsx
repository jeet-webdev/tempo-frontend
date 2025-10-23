import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, Download, Clock, CheckCircle2, TrendingUp, TrendingDown, User,
  AlertCircle, Activity, Target, Zap, BarChart3, Calendar, Filter, Lightbulb, Users
} from 'lucide-react';
import { format, differenceInDays, subDays, addDays, isAfter, isBefore, isToday, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import TaskModal from './tasks/TaskModal';
import { Task } from '@/types';

interface ManagerAnalyticsDashboardProps {
  onBack: () => void;
}

export default function ManagerAnalyticsDashboard({ onBack }: ManagerAnalyticsDashboardProps) {
  const { channels, tasks, users, completedTasks: completedTasksData, stageEvents } = useData();
  const { user } = useAuth();
  const { toast } = useToast();

  const managedChannels = useMemo(() => 
    channels.filter(c => c.managerId === user?.id),
    [channels, user?.id]
  );

  const [selectedChannels, setSelectedChannels] = useState<string[]>(() => managedChannels.map(c => c.id));
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [dateRange, setDateRange] = useState<number>(30);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'comparative'>('summary');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Date calculations
  const now = new Date();
  const rangeStart = subDays(now, dateRange);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Channel members
  const channelMembers = useMemo(() => {
    const memberIds = new Set<string>();
    managedChannels
      .filter(c => selectedChannels.includes(c.id))
      .forEach(c => c.members.forEach(m => memberIds.add(m)));
    return users.filter(u => memberIds.has(u.id));
  }, [managedChannels, selectedChannels, users]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!selectedChannels.includes(task.channelId)) return false;
      if (selectedRole !== 'all') {
        const assignedUser = users.find(u => u.id === task.assignedTo);
        if (!assignedUser || assignedUser.role !== selectedRole) return false;
      }
      return true;
    });
  }, [tasks, selectedChannels, selectedRole, users]);

  const filteredCompletedTasks = useMemo(() => {
    return completedTasksData.filter(ct => {
      if (!selectedChannels.includes(ct.channelId)) return false;
      if (selectedRole !== 'all') {
        const assignedUser = users.find(u => u.id === ct.assignedTo);
        if (!assignedUser || assignedUser.role !== selectedRole) return false;
      }
      return ct.completedAt >= rangeStart;
    });
  }, [completedTasksData, selectedChannels, selectedRole, users, rangeStart]);

  // Primary metrics
  const kpis = useMemo(() => {
    const activeTasks = filteredTasks.filter(t => !t.completed);
    const tasksToday = activeTasks.filter(t => t.dueDate && isToday(t.dueDate)).length;
    const overdue = activeTasks.filter(t => t.dueDate && isBefore(t.dueDate, now)).length;
    const completed7d = filteredCompletedTasks.filter(t => t.completedAt >= subDays(now, 7)).length;
    const throughput = (completed7d / 7).toFixed(1);
    
    const avgCycleTime = filteredCompletedTasks.length > 0
      ? (filteredCompletedTasks.reduce((sum, ct) => {
          const originalTask = tasks.find(t => t.id === ct.taskId);
          if (!originalTask) return sum;
          return sum + differenceInDays(ct.completedAt, originalTask.createdAt);
        }, 0) / filteredCompletedTasks.length).toFixed(1)
      : '0';

    const completedWithDue = filteredCompletedTasks.filter(t => {
      const originalTask = tasks.find(ot => ot.id === t.taskId);
      return originalTask?.dueDate;
    });
    const onTime = completedWithDue.filter(t => {
      const originalTask = tasks.find(ot => ot.id === t.taskId);
      return originalTask?.dueDate && !isAfter(t.completedAt, originalTask.dueDate);
    }).length;
    const onTimeRate = completedWithDue.length > 0 
      ? Math.round((onTime / completedWithDue.length) * 100) 
      : 0;

    return { tasksToday, overdue, completed7d, throughput, avgCycleTime, onTimeRate, inProgress: activeTasks.length };
  }, [filteredTasks, filteredCompletedTasks, tasks, now]);

  // Team performance matrix
  const teamPerformance = useMemo(() => {
    return channelMembers.map(member => {
      const memberTasks = filteredTasks.filter(t => t.assignedTo === member.id);
      const memberCompleted = filteredCompletedTasks.filter(t => t.assignedTo === member.id);
      const active = memberTasks.filter(t => !t.completed).length;
      const overdue = memberTasks.filter(t => !t.completed && t.dueDate && isBefore(t.dueDate, now)).length;
      
      const avgCycle = memberCompleted.length > 0
        ? (memberCompleted.reduce((sum, ct) => {
            const originalTask = tasks.find(t => t.id === ct.taskId);
            if (!originalTask) return sum;
            return sum + differenceInDays(ct.completedAt, originalTask.createdAt);
          }, 0) / memberCompleted.length).toFixed(1)
        : '0';

      const stageCompletions = stageEvents.filter(e => 
        e.actorUserId === member.id && 
        e.eventType === 'stage_completed' &&
        e.occurredAt >= rangeStart
      ).length;

      const efficiency = memberTasks.length > 0 
        ? Math.round((memberCompleted.length / memberTasks.length) * 100) 
        : 0;

      const assignedChannels = channels.filter(c => c.members.includes(member.id));

      return {
        member,
        completed: memberCompleted.length,
        active,
        overdue,
        avgCycle,
        stageCompletions,
        efficiency,
        channels: assignedChannels.length
      };
    }).sort((a, b) => b.completed - a.completed);
  }, [channelMembers, filteredTasks, filteredCompletedTasks, tasks, stageEvents, channels, rangeStart, now]);

  // Channel efficiency
  const channelEfficiency = useMemo(() => {
    return managedChannels
      .filter(c => selectedChannels.includes(c.id))
      .map(channel => {
        const channelTasks = filteredTasks.filter(t => t.channelId === channel.id);
        const channelCompleted = filteredCompletedTasks.filter(t => t.channelId === channel.id);
        
        const avgTime = channelCompleted.length > 0
          ? (channelCompleted.reduce((sum, ct) => {
              const originalTask = tasks.find(t => t.id === ct.taskId);
              if (!originalTask) return sum;
              return sum + differenceInDays(ct.completedAt, originalTask.createdAt);
            }, 0) / channelCompleted.length).toFixed(1)
          : '0';

        const stageCompletions = stageEvents.filter(e => 
          e.channelId === channel.id && 
          e.eventType === 'stage_completed' &&
          e.occurredAt >= rangeStart
        ).length;

        const contribution = filteredCompletedTasks.length > 0
          ? Math.round((channelCompleted.length / filteredCompletedTasks.length) * 100)
          : 0;

        return {
          channel,
          avgTime,
          completed: channelCompleted.length,
          stageCompletions,
          contribution
        };
      })
      .sort((a, b) => b.completed - a.completed);
  }, [managedChannels, selectedChannels, filteredTasks, filteredCompletedTasks, tasks, stageEvents, rangeStart]);

  // Column efficiency
  const columnEfficiency = useMemo(() => {
    const columnData: Record<string, { count: number; totalDays: number }> = {};
    
    filteredTasks.filter(t => !t.completed).forEach(task => {
      const channel = channels.find(c => c.id === task.channelId);
      const column = channel?.columns.find(col => col.id === task.columnId);
      
      if (column) {
        if (!columnData[column.name]) {
          columnData[column.name] = { count: 0, totalDays: 0 };
        }
        const daysInColumn = differenceInDays(now, task.updatedAt);
        columnData[column.name].count++;
        columnData[column.name].totalDays += daysInColumn;
      }
    });

    return Object.entries(columnData)
      .map(([name, data]) => ({
        name,
        avgTime: (data.totalDays / data.count).toFixed(1),
        count: data.count
      }))
      .sort((a, b) => parseFloat(b.avgTime) - parseFloat(a.avgTime));
  }, [filteredTasks, channels, now]);

  // Bottlenecks
  const bottlenecks = useMemo(() => {
    return columnEfficiency
      .filter(col => parseFloat(col.avgTime) > 5)
      .slice(0, 5);
  }, [columnEfficiency]);

  // Aging tasks
  const agingTasks = useMemo(() => {
    return filteredTasks
      .filter(t => !t.completed)
      .map(task => {
        const channel = channels.find(c => c.id === task.channelId);
        const column = channel?.columns.find(col => col.id === task.columnId);
        const daysInColumn = differenceInDays(now, task.updatedAt);
        return { task, channel, column, daysInColumn };
      })
      .sort((a, b) => b.daysInColumn - a.daysInColumn)
      .slice(0, 10);
  }, [filteredTasks, channels, now]);

  // Due pipeline
  const duePipeline = useMemo(() => {
    const pipeline: { date: string; count: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const date = addDays(now, i);
      const count = filteredTasks.filter(t => 
        !t.completed && t.dueDate && format(t.dueDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length;
      pipeline.push({ date: format(date, 'MMM d'), count });
    }
    return pipeline;
  }, [filteredTasks, now]);

  // AI Insights
  const insights = useMemo(() => {
    const insights: { type: 'warning' | 'success' | 'info'; message: string }[] = [];
    
    // Channels at risk
    channelEfficiency.forEach(ce => {
      if (parseFloat(ce.avgTime) > 10) {
        insights.push({
          type: 'warning',
          message: `${ce.channel.name} has high avg cycle time (${ce.avgTime} days)`
        });
      }
    });

    // Top performers
    if (teamPerformance.length > 0 && teamPerformance[0].completed > 10) {
      insights.push({
        type: 'success',
        message: `${teamPerformance[0].member.name} is top performer with ${teamPerformance[0].completed} completions`
      });
    }

    // Bottleneck roles
    bottlenecks.forEach(b => {
      insights.push({
        type: 'warning',
        message: `${b.name} column is a bottleneck (${b.avgTime} days avg)`
      });
    });

    return insights.slice(0, 5);
  }, [channelEfficiency, teamPerformance, bottlenecks]);

  // Export CSV
  const handleExport = () => {
    const csvData = teamPerformance.map(({ member, completed, active, overdue, avgCycle, stageCompletions, efficiency, channels }) => ({
      name: member.name,
      role: member.role,
      completed,
      active,
      overdue,
      avg_cycle_time: avgCycle,
      stage_completions: stageCompletions,
      efficiency_percent: efficiency,
      assigned_channels: channels
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
    a.download = `manager-analytics-${format(now, 'yyyy-MM-dd')}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "Analytics data exported to CSV.",
    });
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const toggleAllChannels = () => {
    if (selectedChannels.length === managedChannels.length) {
      setSelectedChannels([]);
    } else {
      setSelectedChannels(managedChannels.map(c => c.id));
    }
  };

  if (managedChannels.length === 0) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="glass-card">
            <CardContent className="py-16 text-center">
              <p className="text-heading text-lg font-bold mb-2">No channels assigned</p>
              <p className="text-body">You need to be a manager of at least one channel to access analytics.</p>
              <Button onClick={onBack} className="btn-primary-liquid mt-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="max-w-[1800px] mx-auto mb-6">
        <div className="glass-card p-6 fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="icon-btn-liquid">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold gradient-text">Manager Analytics Suite</h1>
                <p className="text-body text-sm mt-1">Deep insights into channel and team efficiency</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Select value="channels" onValueChange={() => {}}>
                  <SelectTrigger className="w-40 input-liquid h-9">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue>
                      {selectedChannels.length} Channel{selectedChannels.length !== 1 ? 's' : ''}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="modal-liquid">
                    <div className="p-2 space-y-2">
                      <div className="flex items-center space-x-2 px-2 py-1.5 hover:bg-white/10 rounded cursor-pointer" onClick={toggleAllChannels}>
                        <Checkbox checked={selectedChannels.length === managedChannels.length} />
                        <span className="text-sm font-semibold">All Channels</span>
                      </div>
                      {managedChannels.map(c => (
                        <div key={c.id} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-white/10 rounded cursor-pointer" onClick={() => toggleChannel(c.id)}>
                          <Checkbox checked={selectedChannels.includes(c.id)} />
                          <span className="text-sm">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-36 input-liquid h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="modal-liquid">
                  <SelectItem value="all">All Roles</SelectItem>
                  {Array.from(new Set(channelMembers.map(u => u.role))).map(role => (
                    <SelectItem key={role} value={role}>
                      {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(Number(v))}>
                <SelectTrigger className="w-32 input-liquid h-9">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="modal-liquid">
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="w-36 input-liquid h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="modal-liquid">
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="comparative">Comparative</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExport} className="btn-secondary-liquid h-9 px-4">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {selectedChannels.length === 0 ? (
        <div className="max-w-[1800px] mx-auto">
          <Card className="glass-card">
            <CardContent className="py-16 text-center">
              <p className="text-heading text-lg font-bold mb-2">No channels selected</p>
              <p className="text-body">Please select at least one channel to view analytics.</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* 2️⃣ PRIMARY METRIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="stat-card-liquid card-blue fade-in p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-300" />
                <p className="text-xs text-white/70 font-semibold uppercase">Today</p>
              </div>
              <p className="text-3xl font-bold text-white">{kpis.tasksToday}</p>
            </Card>
            <Card className="stat-card-liquid card-red fade-in p-4" style={{ animationDelay: '0.05s' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-300" />
                <p className="text-xs text-white/70 font-semibold uppercase">Overdue</p>
              </div>
              <p className="text-3xl font-bold text-white">{kpis.overdue}</p>
            </Card>
            <Card className="stat-card-liquid card-green fade-in p-4" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-300" />
                <p className="text-xs text-white/70 font-semibold uppercase">Done (7d)</p>
              </div>
              <p className="text-3xl font-bold text-white">{kpis.completed7d}</p>
            </Card>
            <Card className="stat-card-liquid card-cyan fade-in p-4" style={{ animationDelay: '0.15s' }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-cyan-300" />
                <p className="text-xs text-white/70 font-semibold uppercase">Throughput</p>
              </div>
              <p className="text-3xl font-bold text-white">{kpis.throughput}</p>
              <p className="text-xs text-white/60">per day</p>
            </Card>
            <Card className="stat-card-liquid card-pink fade-in p-4" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-pink-300" />
                <p className="text-xs text-white/70 font-semibold uppercase">Cycle Time</p>
              </div>
              <p className="text-2xl font-bold text-white">{kpis.avgCycleTime}d</p>
            </Card>
            <Card className="stat-card-liquid card-purple fade-in p-4" style={{ animationDelay: '0.25s' }}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-300" />
                <p className="text-xs text-white/70 font-semibold uppercase">On-Time</p>
              </div>
              <p className="text-3xl font-bold text-white">{kpis.onTimeRate}%</p>
            </Card>
          </div>

          {/* 3️⃣ TEAM PERFORMANCE MATRIX */}
          <div className="glass-card p-6 md:p-8 fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="icon-btn-liquid">
                  <Users className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold">Team Performance Matrix</h2>
              </div>
              <Badge className="badge-primary">{teamPerformance.length} Members</Badge>
            </div>

            <div className="overflow-x-auto">
              <Table className="table-liquid">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Channels</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead className="text-right">Avg Cycle</TableHead>
                    <TableHead className="text-right">Stages</TableHead>
                    <TableHead className="text-right">Efficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamPerformance.map((perf) => (
                    <TableRow key={perf.member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 avatar-liquid">
                            <AvatarFallback>{perf.member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">{perf.member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-xs">{perf.member.role.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="badge-neutral">{perf.channels}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="badge-success">{perf.completed}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="badge-primary">{perf.active}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={perf.overdue > 0 ? "badge-danger" : "badge-neutral"}>{perf.overdue}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{perf.avgCycle}d</TableCell>
                      <TableCell className="text-right">
                        <Badge className="badge-primary">{perf.stageCompletions}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={
                          perf.efficiency >= 80 ? "badge-success" : 
                          perf.efficiency >= 60 ? "badge-warning" : 
                          "badge-neutral"
                        }>
                          {perf.efficiency}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 4️⃣ CHANNEL EFFICIENCY ANALYTICS */}
          <div className="glass-card p-6 md:p-8 fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-btn-liquid">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">Channel Efficiency</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channelEfficiency.map((ce, idx) => (
                <Card key={ce.channel.id} className="glass-card p-5" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold mb-1">{ce.channel.name}</h3>
                      <p className="text-xs text-muted">{ce.contribution}% contribution</p>
                    </div>
                    <Badge className="badge-success">{ce.completed}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-xs text-muted mb-1">Avg Time</p>
                      <p className="text-xl font-bold">{ce.avgTime}d</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-xs text-muted mb-1">Stages</p>
                      <p className="text-xl font-bold text-purple-400">{ce.stageCompletions}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 5️⃣ BOTTLENECK AND WORKLOAD PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6 md:p-8 fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-btn-liquid">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">Bottlenecks</h2>
              </div>
              <div className="space-y-4">
                {bottlenecks.length === 0 ? (
                  <p className="text-body text-center py-8">No bottlenecks detected</p>
                ) : (
                  bottlenecks.map((b, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-white">{b.name}</p>
                          <p className="text-xs text-muted mt-1">{b.count} tasks stuck</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-400">{b.avgTime}d</p>
                          <p className="text-xs text-muted">avg delay</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-card p-6 md:p-8 fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-btn-liquid">
                  <Activity className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">Workload Distribution</h2>
              </div>
              <div className="space-y-4">
                {columnEfficiency.map((col, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{col.name}</span>
                      <span className="text-muted">{col.count} tasks • {col.avgTime}d avg</span>
                    </div>
                    <div className="progress-bar-liquid">
                      <div 
                        className="progress-fill-liquid" 
                        style={{ width: `${Math.min((col.count / Math.max(...columnEfficiency.map(c => c.count))) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 6️⃣ AGING TASKS + PIPELINE FORECAST */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6 md:p-8 fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-btn-liquid">
                  <Clock className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">Aging Tasks</h2>
              </div>
              <div className="space-y-3">
                {agingTasks.length === 0 ? (
                  <p className="text-body text-center py-8">No aging tasks</p>
                ) : (
                  agingTasks.map(({ task, channel, column, daysInColumn }) => (
                    <div 
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-4 glass-card hover:scale-[1.02] cursor-pointer transition-all"
                    >
                      <div className="font-semibold text-sm mb-2">{task.title}</div>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>{channel?.name} • {column?.name}</span>
                        <Badge className={daysInColumn > 7 ? "badge-danger" : "badge-warning"}>
                          {daysInColumn} days
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-card p-6 md:p-8 fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-btn-liquid">
                  <Calendar className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">Next 14 Days Forecast</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {duePipeline.map(({ date, count }, idx) => (
                  <div key={idx} className="flex flex-col items-center min-w-[60px]">
                    <div className="text-xs text-muted mb-2 font-semibold">{date.split(' ')[1]}</div>
                    <div 
                      className="w-12 rounded-t bg-gradient-to-t from-purple-500/60 to-pink-500/60"
                      style={{ height: `${Math.max(count * 10, 6)}px` }}
                    />
                    <div className="text-sm font-bold mt-2">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 8️⃣ AI-ASSISTED INSIGHTS */}
          <div className="glass-card p-6 md:p-8 fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-btn-liquid">
                <Lightbulb className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">AI Insights & Predictions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border ${
                    insight.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    insight.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                    'bg-blue-500/10 border-blue-500/30'
                  }`}
                >
                  <p className="text-sm text-white">{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
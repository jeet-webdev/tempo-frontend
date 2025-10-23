import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { CompletedTask } from '@/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import { 
  Download, 
  ExternalLink, 
  User,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { format, isWithinInterval } from 'date-fns';
import { useToast } from './ui/use-toast';
import ExportDialog, { ExportConfig } from './ExportDialog';
import { STORAGE_KEYS } from '@/constants';

interface CompletedTasksPageProps {
  channelId: string;
  onBack: () => void;
}

export default function CompletedTasksPage({ channelId, onBack }: CompletedTasksPageProps) {
  const { completedTasks, channels, users } = useData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<CompletedTask | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);

  const channel = channels.find(c => c.id === channelId);
  const channelTasks = completedTasks.filter(t => t.channelId === channelId);

  const canEdit = user?.role === 'owner' || channel?.managerId === user?.id;

  const filteredTasks = useMemo(() => {
    return channelTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAssignee = selectedAssignee === 'all' || task.assignees.includes(selectedAssignee);
      return matchesSearch && matchesAssignee;
    });
  }, [channelTasks, searchQuery, selectedAssignee]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleSelectTask = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleExport = (config: ExportConfig) => {
    let tasksToExport = config.scope === 'selected' && selectedIds.size > 0
      ? filteredTasks.filter(t => selectedIds.has(t.id))
      : filteredTasks;

    // Apply date range filter
    if (config.dateFrom && config.dateTo) {
      tasksToExport = tasksToExport.filter(t => 
        isWithinInterval(t.completedAt, { start: config.dateFrom!, end: config.dateTo! })
      );
    }

    if (tasksToExport.length === 0) {
      toast({
        title: "No tasks to export",
        description: "No tasks match the selected criteria.",
        variant: "warning"
      });
      return;
    }

    // Build CSV headers based on selected fields
    const headers: string[] = [];
    const fieldMap: Record<string, boolean> = {};
    config.fields.forEach(f => fieldMap[f] = true);

    if (fieldMap['Channel']) headers.push('Channel');
    if (fieldMap['Title']) headers.push('Title');
    if (fieldMap['Completed At']) headers.push('Completed At');
    if (fieldMap['Due Date']) headers.push('Due Date');
    if (fieldMap['Assignees']) headers.push('Assignees');
    if (fieldMap['Column Path']) headers.push('Column');

    // Add custom field headers if selected
    const customFieldKeys = new Set<string>();
    if (fieldMap['Custom Fields']) {
      tasksToExport.forEach(t => {
        Object.keys(t.customFieldValues || {}).forEach(key => customFieldKeys.add(key));
      });
      headers.push(...Array.from(customFieldKeys));
    }

    // Add link headers if selected
    if (fieldMap['Final Links']) {
      headers.push('Video URL', 'Thumbnail URL', 'Script URL', 'Audio URL', 'Other Links');
    }

    const rows = tasksToExport.map(task => {
      const row: string[] = [];
      
      if (fieldMap['Channel']) row.push(task.channelName || '');
      if (fieldMap['Title']) row.push(task.title);
      if (fieldMap['Completed At']) row.push(format(task.completedAt, 'yyyy-MM-dd HH:mm'));
      if (fieldMap['Due Date']) row.push(task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : '');
      if (fieldMap['Assignees']) {
        const assigneeNames = task.assignees
          .map(id => users.find(u => u.id === id)?.name || id)
          .join('; ');
        row.push(assigneeNames);
      }
      if (fieldMap['Column Path']) row.push(task.columnName);

      // Add custom field values
      if (fieldMap['Custom Fields']) {
        customFieldKeys.forEach(key => {
          row.push(String(task.customFieldValues?.[key] || ''));
        });
      }

      // Add links
      if (fieldMap['Final Links']) {
        row.push(
          task.videoUrl || '',
          task.thumbnailUrl || '',
          task.scriptUrl || '',
          task.audioUrl || '',
          (task.otherLinks || []).join('; ')
        );
      }

      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `\"${String(cell).replace(/"/g, '""')}\"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    // Generate filename with date range if applicable
    let filename = `completed_tasks_${channel?.name}_${format(new Date(), 'yyyy-MM-dd')}`;
    if (config.dateFrom && config.dateTo) {
      filename = `completed_tasks_${channel?.name}_${format(config.dateFrom, 'yyyy-MM-dd')}_${format(config.dateTo, 'yyyy-MM-dd')}`;
    }
    link.download = `${filename}.csv`;
    link.click();

    toast({
      title: "Export successful",
      description: `Exported ${tasksToExport.length} tasks.`,
      variant: "success"
    });
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="max-w-full mx-auto mb-8">
        <div className="glass-card p-8 fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="icon-btn-liquid"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Completed Tasks</h1>
                <p className="text-body mt-1">{channel?.name} • {filteredTasks.length} tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <Badge className="modern-badge">
                  {selectedIds.size} selected
                </Badge>
              )}
              <Button
                onClick={() => setShowExportDialog(true)}
                className="modern-button modern-button-primary h-10 px-4"
                disabled={filteredTasks.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-full mx-auto mb-6">
        <Card className="modern-card">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="modern-input w-full h-10"
                />
              </div>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger className="w-48 modern-input h-10">
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent className="modern-modal">
                  <SelectItem value="all">All Assignees</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Table */}
      <div className="max-w-full mx-auto">
        <Card className="modern-card">
          <CardContent className="pt-6">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted" />
                <p className="text-heading text-lg font-bold mb-2">No completed tasks yet</p>
                <p className="text-body mb-6">Completed tasks will appear here</p>
                <Button
                  onClick={onBack}
                  className="modern-button modern-button-secondary"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Board
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <Checkbox
                    checked={selectedIds.size === filteredTasks.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <div className="flex-1 grid grid-cols-12 gap-4 text-xs font-semibold text-heading uppercase tracking-wide">
                    <div className="col-span-4">Title</div>
                    <div className="col-span-2">Completed</div>
                    <div className="col-span-2">Due Date</div>
                    <div className="col-span-2">Assignees</div>
                    <div className="col-span-2">Column</div>
                  </div>
                </div>

                {/* Rows */}
                {filteredTasks.map(task => {
                  const assigneeNames = task.assignees
                    .map(id => users.find(u => u.id === id)?.name || 'Unknown')
                    .join(', ');

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 modern-card p-4 hover:bg-white/5 transition-all cursor-pointer"
                      onClick={() => setSelectedTask(task)}
                    >
                      <Checkbox
                        checked={selectedIds.has(task.id)}
                        onCheckedChange={() => handleSelectTask(task.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4">
                          <p className="text-sm font-bold text-heading truncate">{task.title}</p>
                          <p className="text-xs text-body truncate">{task.description || '—'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-body">{format(task.completedAt, 'MMM d, yyyy')}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-body">
                            {task.dueDate ? format(task.dueDate, 'MMM d, yyyy') : '—'}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-body truncate">{assigneeNames}</p>
                        </div>
                        <div className="col-span-2">
                          <Badge className="modern-badge text-xs">{task.columnName}</Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
      />

      {/* Detail Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent className="modern-modal w-full sm:max-w-2xl overflow-y-auto">
          {selectedTask && (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl font-bold gradient-text">
                  {selectedTask.title}
                </SheetTitle>
                <SheetDescription className="text-body">
                  Completed on {format(selectedTask.completedAt, 'PPP')}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-8">
                {selectedTask.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-heading uppercase tracking-wide mb-2">Description</h3>
                    <p className="text-sm text-body">{selectedTask.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-semibold text-heading uppercase tracking-wide mb-2">Column</h3>
                    <Badge className="modern-badge">{selectedTask.columnName}</Badge>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-heading uppercase tracking-wide mb-2">Due Date</h3>
                    <p className="text-sm text-body">
                      {selectedTask.dueDate ? format(selectedTask.dueDate, 'PPP') : 'No due date'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-heading uppercase tracking-wide mb-2">Assignees</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.assignees.map(id => {
                      const assignee = users.find(u => u.id === id);
                      return (
                        <Badge key={id} className="modern-badge">
                          <User className="h-3 w-3 mr-1" />
                          {assignee?.name || 'Unknown'}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {Object.keys(selectedTask.customFieldValues || {}).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-heading uppercase tracking-wide mb-3">Custom Fields</h3>
                    <div className="space-y-2">
                      {Object.entries(selectedTask.customFieldValues).map(([key, value]) => (
                        <div key={key} className="modern-card p-3">
                          <p className="text-xs text-muted mb-1">{key}</p>
                          <p className="text-sm text-heading">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedTask.links.length > 0 || selectedTask.videoUrl || selectedTask.thumbnailUrl || selectedTask.scriptUrl || selectedTask.audioUrl || (selectedTask.otherLinks && selectedTask.otherLinks.length > 0)) && (
                  <div>
                    <h3 className="text-sm font-semibold text-heading uppercase tracking-wide mb-3">Links</h3>
                    <div className="space-y-2">
                      {selectedTask.videoUrl && (
                        <a
                          href={selectedTask.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="modern-card p-3 flex items-center justify-between hover:bg-white/5 transition-all"
                        >
                          <span className="text-sm text-heading">Video URL</span>
                          <ExternalLink className="h-4 w-4 text-purple-400" />
                        </a>
                      )}
                      {selectedTask.thumbnailUrl && (
                        <a
                          href={selectedTask.thumbnailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="modern-card p-3 flex items-center justify-between hover:bg-white/5 transition-all"
                        >
                          <span className="text-sm text-heading">Thumbnail URL</span>
                          <ExternalLink className="h-4 w-4 text-purple-400" />
                        </a>
                      )}
                      {selectedTask.scriptUrl && (
                        <a
                          href={selectedTask.scriptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="modern-card p-3 flex items-center justify-between hover:bg-white/5 transition-all"
                        >
                          <span className="text-sm text-heading">Script URL</span>
                          <ExternalLink className="h-4 w-4 text-purple-400" />
                        </a>
                      )}
                      {selectedTask.audioUrl && (
                        <a
                          href={selectedTask.audioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="modern-card p-3 flex items-center justify-between hover:bg-white/5 transition-all"
                        >
                          <span className="text-sm text-heading">Audio URL</span>
                          <ExternalLink className="h-4 w-4 text-purple-400" />
                        </a>
                      )}
                      {selectedTask.links.map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="modern-card p-3 flex items-center justify-between hover:bg-white/5 transition-all"
                        >
                          <span className="text-sm text-heading truncate">{link}</span>
                          <ExternalLink className="h-4 w-4 text-purple-400" />
                        </a>
                      ))}
                      {selectedTask.otherLinks?.map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="modern-card p-3 flex items-center justify-between hover:bg-white/5 transition-all"
                        >
                          <span className="text-sm text-heading truncate">{link}</span>
                          <ExternalLink className="h-4 w-4 text-purple-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
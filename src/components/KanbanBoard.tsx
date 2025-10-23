import React, { useState, useEffect } from 'react';
import { Channel, Task } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, ArrowLeft, Settings, Users, Check, X } from 'lucide-react';
import TaskCard from './tasks/TaskCard';
import CreateTaskDialog from './tasks/CreateTaskDialog';
import EditColumnsDialog from './EditColumnsDialog';
import ChannelMembersDialog from './channels/ChannelMembersDialog';
import CustomFieldsManager from './CustomFieldsManager';
import ChannelSettingsDialog from './channels/ChannelSettingsDialog';
import LogOTDialog from './LogOTDialog';
import { useToast } from '@/components/ui/use-toast';
import { Sliders } from 'lucide-react';
import { Settings2 } from 'lucide-react';
import { Clock } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CompletedTasksPage from './CompletedTasksPage';

interface KanbanBoardProps {
  channel: Channel;
  onBack: () => void;
}

export default function KanbanBoard({ channel: initialChannel, onBack }: KanbanBoardProps) {
  const { tasks, updateTask, updateChannel, channels, users, addStageEvent } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditColumns, setShowEditColumns] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showLogOT, setShowLogOT] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [activeTab, setActiveTab] = useState<'board' | 'completed'>('board');

  // Get the latest channel data from context
  const channel = channels.find(c => c.id === initialChannel.id) || initialChannel;

  // Check if channel still exists
  useEffect(() => {
    if (!channels.find(c => c.id === initialChannel.id)) {
      onBack();
    }
  }, [channels, initialChannel.id, onBack]);

  const channelTasks = tasks.filter(t => t.channelId === channel.id && !t.completed);
  const { completedTasks } = useData();
  const channelCompletedCount = completedTasks.filter(t => t.channelId === channel.id).length;

  const canEditColumns = user?.role === 'owner' || user?.role === 'channel_manager';

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (columnId: string) => {
    if (draggedTask && draggedTask.columnId !== columnId) {
      // Find the new column assignment
      const newColumnAssignment = channel.columnAssignments?.find(ca => ca.columnId === columnId);
      const newAssignee = newColumnAssignment?.assignedUserIds?.[0];
      
      // Update task with new column and assignee
      updateTask(draggedTask.id, { 
        columnId,
        assignedTo: newAssignee || undefined,
      });

      // Record stage completion event for analytics
      addStageEvent({
        taskId: draggedTask.id,
        channelId: draggedTask.channelId,
        actorUserId: user?.id || '',
        fromColumnId: draggedTask.columnId,
        toColumnId: columnId,
        eventType: 'stage_completed',
      });

      // Show toast notification
      if (newAssignee) {
        const assignedUser = users.find(u => u.id === newAssignee);
        toast({
          title: "Task reassigned",
          description: `Task moved and assigned to ${assignedUser?.name || 'user'}.`,
        });
      } else {
        toast({
          title: "Task unassigned",
          description: "Task moved to a column with no assigned user.",
        });
      }
    }
    setDraggedTask(null);
  };

  const handleAddTask = (columnId: string) => {
    setSelectedColumn(columnId);
    setShowCreateTask(true);
  };

  const handleSaveColumns = (newColumns: typeof channel.columns) => {
    updateChannel(channel.id, { columns: newColumns });
  };

  const handleStartEditColumn = (columnId: string, currentName: string) => {
    setEditingColumnId(columnId);
    setEditingColumnName(currentName);
  };

  const handleSaveColumnName = () => {
    if (!editingColumnId || !editingColumnName.trim()) return;
    
    const updatedColumns = channel.columns.map(col =>
      col.id === editingColumnId ? { ...col, name: editingColumnName.trim() } : col
    );
    
    updateChannel(channel.id, { columns: updatedColumns });
    setEditingColumnId(null);
    setEditingColumnName('');
    
    toast({
      title: "Saved",
      description: "Column renamed.",
    });
  };

  const handleCancelEditColumn = () => {
    setEditingColumnId(null);
    setEditingColumnName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveColumnName();
    } else if (e.key === 'Escape') {
      handleCancelEditColumn();
    }
  };

  const tasksInColumns = channelTasks.reduce((acc, task) => {
    acc[task.columnId] = (acc[task.columnId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (activeTab === 'completed') {
    return (
      <CompletedTasksPage 
        channelId={channel.id} 
        onBack={() => setActiveTab('board')} 
      />
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto mb-8">
        <div className="glass-card p-8 fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="icon-btn-liquid"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold mb-2">{channel.name}</h1>
                {channel.description && (
                  <p className="text-body text-base">{channel.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="glass-card px-4 py-3 text-sm text-body font-semibold">
                {channelTasks.length} active tasks
              </div>
              {canEditColumns && (
                <>
                  <button
                    onClick={() => setShowLogOT(true)}
                    className="btn-secondary-liquid h-10 px-4 text-sm flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Log OT
                  </button>
                  <button
                    onClick={() => setShowMembers(true)}
                    className="btn-secondary-liquid h-10 px-4 text-sm flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Members
                  </button>
                  <button
                    onClick={() => setShowCustomFields(true)}
                    className="btn-secondary-liquid h-10 px-4 text-sm flex items-center gap-2"
                  >
                    <Sliders className="h-4 w-4" />
                    Custom Fields
                  </button>
                  <button
                    onClick={() => setShowEditColumns(true)}
                    className="btn-secondary-liquid h-10 px-4 text-sm flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Edit Columns
                  </button>
                  <button
                    onClick={() => setShowChannelSettings(true)}
                    className="icon-btn-liquid"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="completed">
                Completed {channelCompletedCount > 0 && `(${channelCompletedCount})`}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-6 overflow-x-auto pb-4">
          {channel.columns.map((column) => {
            const columnTasks = channelTasks.filter(t => t.columnId === column.id);
            const isEditing = editingColumnId === column.id;
            
            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-80"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
              >
                <div className="kanban-column-liquid h-full fade-in">
                  <div className="mb-6">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingColumnName}
                          onChange={(e) => setEditingColumnName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="input-liquid h-10 text-heading"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveColumnName}
                          className="icon-btn-liquid w-10 h-10"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </button>
                        <button
                          onClick={handleCancelEditColumn}
                          className="icon-btn-liquid w-10 h-10"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => canEditColumns && handleStartEditColumn(column.id, column.name)}
                        >
                          <h3 className="text-lg font-bold text-heading">{column.name}</h3>
                          <span className="badge-liquid text-xs">
                            {columnTasks.length}
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddTask(column.id)}
                          className="icon-btn-liquid w-10 h-10"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {columnTasks.length === 0 ? (
                      <div className="empty-state py-12">
                        <p className="text-muted text-sm">No tasks yet</p>
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onDragStart={() => handleDragStart(task)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        channelId={channel.id}
        defaultColumnId={selectedColumn}
      />

      <EditColumnsDialog
        open={showEditColumns}
        onOpenChange={setShowEditColumns}
        columns={channel.columns}
        onSave={handleSaveColumns}
        tasksInColumns={tasksInColumns}
        channelId={channel.id}
      />

      <ChannelMembersDialog
        open={showMembers}
        onOpenChange={setShowMembers}
        channel={channel}
      />

      <CustomFieldsManager
        open={showCustomFields}
        onOpenChange={setShowCustomFields}
        channel={channel}
      />

      <ChannelSettingsDialog
        open={showChannelSettings}
        onOpenChange={setShowChannelSettings}
        channel={channel}
        onDeleted={onBack}
      />

      <LogOTDialog
        open={showLogOT}
        onOpenChange={setShowLogOT}
        channelId={channel.id}
      />
    </div>
  );
}
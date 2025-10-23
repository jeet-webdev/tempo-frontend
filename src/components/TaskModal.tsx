import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Task, CustomField } from '@/types';
import { CalendarIcon, Trash2, Lock, ExternalLink, X, Clock, User as UserIcon, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface TaskModalProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TaskModal({ task, open, onOpenChange }: TaskModalProps) {
  const { updateTask, deleteTask, channels, users } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(task.dueDate);
  const [assignedTo, setAssignedTo] = useState<string | undefined>(task.assignedTo);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(task.customFieldValues || {});
  const [isSaving, setIsSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  const channel = channels.find(c => c.id === task.channelId);
  const customFields = channel?.customFields || [];
  const currentColumn = channel?.columns.find(col => col.id === task.columnId);
  const assignedUser = users.find(u => u.id === assignedTo);
  const channelMembers = users.filter(u => channel?.members.includes(u.id));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape' && !editingTitle) {
        onOpenChange(false);
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, title, description, dueDate, customFieldValues, assignedTo, editingTitle]);

  const canEditField = (field: CustomField): boolean => {
    if (!user) return false;
    if (user.role === 'owner') return true;

    const permissions = field.permissions;
    if (!permissions) return true;

    if (permissions.editableByRoles && permissions.editableByRoles.includes(user.role)) {
      return true;
    }

    if (permissions.editableByColumnResponsibility && channel) {
      const assignment = channel.columnAssignments?.find(a => a.columnId === task.columnId);
      if (assignment?.assignedUserIds?.includes(user.id)) {
        return true;
      }
    }

    if (permissions.editableByUsers && permissions.editableByUsers.includes(user.id)) {
      return true;
    }

    return false;
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);

    // Check required fields
    if (channel) {
      const requiredFields = customFields.filter(f => 
        f.requiredInColumns?.includes(task.columnId)
      );
      
      const missingFields = requiredFields.filter(f => {
        const value = customFieldValues[f.id];
        return !value || (typeof value === 'string' && !value.trim());
      });
      
      if (missingFields.length > 0) {
        toast({
          title: "Required fields missing",
          description: `Please complete: ${missingFields.map(f => f.name).join(', ')}`,
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
    }

    updateTask(task.id, {
      title: title.trim(),
      description: description.trim(),
      dueDate,
      assignedTo,
      customFieldValues,
    });

    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Saved",
        description: "Task updated successfully.",
      });
    }, 300);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
      onOpenChange(false);
      
      toast({
        title: "Saved",
        description: "Task deleted.",
      });
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setCustomFieldValues({ ...customFieldValues, [fieldId]: value });
    handleSave();
  };

  const handleQuickDueDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setDueDate(date);
    handleSave();
  };

  const renderCustomField = (field: CustomField) => {
    const value = customFieldValues[field.id];
    const canEdit = canEditField(field);
    const isRequired = field.requiredInColumns?.includes(task.columnId);

    return (
      <div key={field.id} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm text-heading font-medium">
            {field.name}
            {isRequired && <span className="text-red-400">*</span>}
            {!canEdit && <Lock className="h-3 w-3 text-muted" />}
          </Label>
        </div>

        {field.type === 'text' && (
          <Input
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            onBlur={handleSave}
            disabled={!canEdit}
            className="modern-input h-10"
            placeholder={`Enter ${field.name.toLowerCase()}`}
          />
        )}

        {field.type === 'link' && (
          <div className="flex gap-2">
            <Input
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              onBlur={handleSave}
              disabled={!canEdit}
              className="modern-input flex-1 h-10"
              placeholder="https://..."
            />
            {value && (
              <Button
                variant="outline"
                size="icon"
                className="icon-button h-10 w-10"
                onClick={() => window.open(value, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {field.type === 'number' && (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            onBlur={handleSave}
            disabled={!canEdit}
            className="modern-input h-10"
          />
        )}

        {field.type === 'date' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={!canEdit}
                className="w-full justify-start text-left font-normal modern-input h-10"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : <span className="text-muted">Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 modern-modal">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleFieldChange(field.id, date?.toISOString())}
                disabled={!canEdit}
              />
            </PopoverContent>
          </Popover>
        )}

        {field.type === 'dropdown' && (
          <Select
            value={value || ''}
            onValueChange={(val) => handleFieldChange(field.id, val)}
            disabled={!canEdit}
          >
            <SelectTrigger className="modern-input h-10">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent className="modern-modal">
              {field.dropdownOptions?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {field.type === 'checkbox' && (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
              disabled={!canEdit}
            />
            <Label className="text-sm text-body">
              {value ? 'Yes' : 'No'}
            </Label>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modern-modal max-w-2xl max-h-[90vh] overflow-y-auto p-8">
        <DialogHeader className="space-y-4 pr-12">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {/* Title */}
          {editingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                setEditingTitle(false);
                handleSave();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEditingTitle(false);
                  handleSave();
                }
                if (e.key === 'Escape') {
                  setTitle(task.title);
                  setEditingTitle(false);
                }
              }}
              className="text-2xl font-bold modern-input"
              autoFocus
            />
          ) : (
            <h2 
              className="text-2xl font-bold gradient-text cursor-pointer hover:opacity-80 transition-opacity break-words whitespace-normal leading-tight line-clamp-2"
              onClick={() => setEditingTitle(true)}
              style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
            >
              {title}
            </h2>
          )}

          {/* Due Date, Channel/Column, Assignee */}
          <div className="flex flex-wrap gap-2 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="modern-input h-9 px-3 rounded-full">
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {dueDate ? format(dueDate, 'MMM d') : 'Due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 modern-modal" align="start">
                <div className="p-2 border-b border-white/20 space-y-1">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-heading hover:bg-white/20" onClick={() => handleQuickDueDate(0)}>
                    Today
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-heading hover:bg-white/20" onClick={() => handleQuickDueDate(1)}>
                    Tomorrow
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-heading hover:bg-white/20" onClick={() => handleQuickDueDate(7)}>
                    Next Monday
                  </Button>
                </div>
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => {
                    setDueDate(date);
                    handleSave();
                  }}
                />
              </PopoverContent>
            </Popover>

            <Badge variant="outline" className="modern-badge max-w-xs truncate">
              {channel?.name} • {currentColumn?.name}
            </Badge>

            {/* Assignee */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="modern-input h-9 px-3 max-w-[200px] rounded-full">
                  <UserIcon className="mr-2 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{assignedUser ? assignedUser.name : 'Assign'}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 modern-modal" align="start">
                <div className="space-y-1">
                  {channelMembers.map(member => (
                    <Button
                      key={member.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-heading hover:bg-white/20"
                      onClick={() => {
                        setAssignedTo(member.id);
                        handleSave();
                      }}
                    >
                      <Avatar className="h-6 w-6 mr-2 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{member.name}</span>
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {isSaving && (
              <span className="text-xs text-muted animate-pulse">Saving...</span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-8">
          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-heading uppercase tracking-wide">Custom Fields</h3>
              <div className="space-y-4">
                {customFields.map(field => renderCustomField(field))}
              </div>
            </div>
          )}

          {/* Description / Notes */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-heading uppercase tracking-wide">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              className="modern-input resize-none min-h-[120px]"
              placeholder="Add a description..."
            />
          </div>

          {/* Activity */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-heading uppercase tracking-wide">Activity</h3>
            <div className="space-y-2">
              <div className="text-xs text-body modern-card p-3 break-words">
                <Clock className="h-3 w-3 inline mr-1" />
                Created {format(task.createdAt, 'MMM d, yyyy')}
              </div>
              <div className="text-xs text-body modern-card p-3 break-words">
                <Clock className="h-3 w-3 inline mr-1" />
                Updated {format(task.updatedAt, 'MMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-white/20 mt-8">
          <Button variant="destructive" onClick={handleDelete} size="sm" className="modern-button bg-gradient-to-r from-red-500/40 to-pink-500/40 hover:from-red-500/60 hover:to-pink-500/60 border-red-500/40 rounded-full">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm" className="modern-button modern-button-secondary rounded-full">
            Close (Esc)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
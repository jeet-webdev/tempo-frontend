import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  defaultColumnId: string;
}

export default function CreateTaskDialog({ open, onOpenChange, channelId, defaultColumnId }: CreateTaskDialogProps) {
  // ... keep rest of code ...
  const { addTask, users, channels } = useData();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [assignedTo, setAssignedTo] = useState<string>('');

  const channel = channels.find(c => c.id === channelId);
  const channelMembers = users.filter(u => channel?.members?.includes(u.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      description: description.trim(),
      channelId,
      columnId: defaultColumnId,
      assignedTo: assignedTo || undefined,
      dueDate,
      notes: [],
      links: [],
      completed: false,
    });

    setTitle('');
    setDescription('');
    setDueDate(undefined);
    setAssignedTo('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modern-modal max-w-lg modal-fade-in">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-heading flex items-center gap-2">
              <Plus className="h-6 w-6 text-indigo-600" />
              Create New Task
            </DialogTitle>
            <DialogDescription className="text-body">
              Add a new task to the production pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-heading font-medium">Task Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Write script for iPhone review"
                className="modern-input h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-heading font-medium">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about the task..."
                className="modern-input resize-none"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-heading font-medium">Assign To (Optional)</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="modern-input h-11">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="modern-modal">
                  {channelMembers.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-heading font-medium">Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal modern-input h-11"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : <span className="text-muted">Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 modern-modal">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="modern-button modern-button-secondary">
              Cancel
            </Button>
            <Button type="submit" className="modern-button modern-button-primary">
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

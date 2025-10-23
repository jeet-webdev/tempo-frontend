import React, { useState } from 'react';
import { Task } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { CheckCircle2 } from 'lucide-react';

interface CompleteTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export default function CompleteTaskDialog({ task, open, onOpenChange, onComplete }: CompleteTaskDialogProps) {
  const { updateTask, deleteTask, addCompletedTask, channels, users } = useData();
  const { user } = useAuth();
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [otherLinks, setOtherLinks] = useState('');

  const channel = channels.find(c => c.id === task.channelId);
  const column = channel?.columns.find(col => col.id === task.columnId);

  const handleComplete = () => {
    // Create completed task record
    const completedTask = {
      taskId: task.id,
      title: task.title,
      description: task.description,
      channelId: task.channelId,
      channelName: channel?.name || '',
      columnId: task.columnId,
      columnName: column?.name || '',
      assignedTo: task.assignedTo,
      assignees: task.assignedTo ? [task.assignedTo] : [],
      dueDate: task.dueDate,
      completedBy: user?.id || '',
      createdBy: user?.id,
      customFieldValues: task.customFieldValues,
      notes: task.notes,
      links: task.links,
      videoUrl: videoUrl || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      scriptUrl: scriptUrl || undefined,
      audioUrl: audioUrl || undefined,
      otherLinks: otherLinks ? otherLinks.split('\n').filter(l => l.trim()) : undefined,
    };

    addCompletedTask(completedTask);
    
    // Remove task from active tasks
    deleteTask(task.id);
    
    onComplete?.();
    onOpenChange(false);
    
    // Reset form
    setVideoUrl('');
    setThumbnailUrl('');
    setScriptUrl('');
    setAudioUrl('');
    setOtherLinks('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modern-modal max-w-2xl max-h-[90vh] overflow-y-auto p-8">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-2xl font-bold gradient-text flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-400" />
            Complete Task
          </DialogTitle>
          <DialogDescription className="text-body">
            Mark "{task.title}" as complete and add final links
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          <div>
            <Label className="text-heading font-medium mb-2 block">Video URL</Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/..."
              className="modern-input"
            />
          </div>

          <div>
            <Label className="text-heading font-medium mb-2 block">Thumbnail URL</Label>
            <Input
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
              className="modern-input"
            />
          </div>

          <div>
            <Label className="text-heading font-medium mb-2 block">Script URL</Label>
            <Input
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://..."
              className="modern-input"
            />
          </div>

          <div>
            <Label className="text-heading font-medium mb-2 block">Audio URL</Label>
            <Input
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://..."
              className="modern-input"
            />
          </div>

          <div>
            <Label className="text-heading font-medium mb-2 block">Other Links (one per line)</Label>
            <Textarea
              value={otherLinks}
              onChange={(e) => setOtherLinks(e.target.value)}
              placeholder="https://..."
              className="modern-input min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-white/20 mt-8">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="modern-button modern-button-secondary rounded-full"
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            className="modern-button modern-button-primary rounded-full"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark as Complete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

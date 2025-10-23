import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { Task } from '@/types';
import { CalendarIcon, Trash2, Plus, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditTaskDialog({ task, open, onOpenChange }: EditTaskDialogProps) {
  // ... keep rest of code ...
  const { updateTask, deleteTask } = useData();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(task.dueDate);
  const [notes, setNotes] = useState<string[]>(task.notes);
  const [links, setLinks] = useState<string[]>(task.links);
  const [newNote, setNewNote] = useState('');
  const [newLink, setNewLink] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    updateTask(task.id, {
      title: title.trim(),
      description: description.trim(),
      dueDate,
      notes,
      links,
    });

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
      onOpenChange(false);
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      setNotes([...notes, newNote.trim()]);
      setNewNote('');
    }
  };

  const handleAddLink = () => {
    if (newLink.trim()) {
      setLinks([...links, newLink.trim()]);
      setNewLink('');
    }
  };

  const handleRemoveNote = (index: number) => {
    setNotes(notes.filter((_, i) => i !== index));
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modern-modal max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold gradient-text">Edit Task</DialogTitle>
            <DialogDescription className="text-body">
              Update task details, add notes, or attach links.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="py-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
              <TabsTrigger value="links">Links ({links.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-heading font-medium">Task Title</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="modern-input h-10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-heading font-medium">Description</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="modern-input resize-none"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-heading font-medium">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal modern-input h-10"
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
            </TabsContent>
            
            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-heading font-medium">Add Note</Label>
                <div className="flex gap-2">
                  <Input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Type a note..."
                    className="modern-input h-10"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNote())}
                  />
                  <Button type="button" onClick={handleAddNote} size="icon" className="icon-button h-10 w-10">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-sm text-body text-center py-8">No notes yet</p>
                ) : (
                  notes.map((note, index) => (
                    <div key={index} className="modern-card p-3 flex items-start justify-between">
                      <p className="text-sm text-heading flex-1">{note}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveNote(index)}
                        className="icon-button h-8 w-8 ml-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="links" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-heading font-medium">Add Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="https://..."
                    className="modern-input h-10"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLink())}
                  />
                  <Button type="button" onClick={handleAddLink} size="icon" className="icon-button h-10 w-10">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {links.length === 0 ? (
                  <p className="text-sm text-body text-center py-8">No links yet</p>
                ) : (
                  links.map((link, index) => (
                    <div key={index} className="modern-card p-3 flex items-center justify-between">
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-purple-400 hover:text-purple-300 hover:underline flex items-center flex-1 truncate"
                      >
                        <LinkIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                        {link}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLink(index)}
                        className="icon-button h-8 w-8 ml-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex justify-between">
            <Button type="button" variant="destructive" onClick={handleDelete} className="modern-button bg-gradient-to-r from-red-500/40 to-pink-500/40 hover:from-red-500/60 hover:to-pink-500/60 border-red-500/40">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Task
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="modern-button modern-button-secondary">
                Cancel
              </Button>
              <Button type="submit" className="modern-button modern-button-primary">
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function QuickNoteButton() {
  const { user } = useAuth();
  const { notes, addNote, appSettings } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  if (!appSettings.notesEnabled) return null;

  const userNotes = notes.filter(n => n.userId === user?.id && !n.deletedAt);

  const handleCreate = () => {
    if (userNotes.length >= 25) {
      toast({
        title: 'Limit reached',
        description: 'You can only have 25 notes.',
        variant: 'destructive',
      });
      return;
    }

    addNote({
      userId: user!.id,
      title: title || 'Quick Note',
      body: body,
      tags: [],
      isPinned: false,
    });

    setTitle('');
    setBody('');
    setOpen(false);

    toast({
      title: 'Created',
      description: 'Note created successfully.',
    });

    navigate('/notes');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-40 flex items-center justify-center p-0"
        style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.9), rgba(236, 72, 153, 0.9))',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <StickyNote className="h-6 w-6 text-white" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="modern-modal">
          <DialogHeader>
            <DialogTitle>Quick Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title (optional)"
              className="modern-input"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind?"
              className="modern-input min-h-[200px]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreate} className="modern-button flex-1">
                Create & Open
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
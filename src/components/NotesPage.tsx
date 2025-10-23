import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Pin, Archive, Trash2, Check, X, Tag, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Note } from '@/types';
import { format } from 'date-fns';

const MAX_NOTES = 25;
const AUTOSAVE_DELAY = 800;

const COLORS = [
  { name: 'None', value: undefined },
  { name: 'Red', value: 'rgba(239, 68, 68, 0.15)' },
  { name: 'Orange', value: 'rgba(249, 115, 22, 0.15)' },
  { name: 'Yellow', value: 'rgba(234, 179, 8, 0.15)' },
  { name: 'Green', value: 'rgba(34, 197, 94, 0.15)' },
  { name: 'Blue', value: 'rgba(59, 130, 246, 0.15)' },
  { name: 'Purple', value: 'rgba(168, 85, 247, 0.15)' },
  { name: 'Pink', value: 'rgba(236, 72, 153, 0.15)' },
];

export default function NotesPage() {
  const { user } = useAuth();
  const { notes, addNote, updateNote, deleteNote } = useData();
  const { toast } = useToast();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editColor, setEditColor] = useState<string | undefined>();
  const [newTag, setNewTag] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | ''>('');
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [deletedNote, setDeletedNote] = useState<Note | null>(null);

  const userNotes = useMemo(() => 
    notes.filter(n => n.userId === user?.id && !n.deletedAt),
    [notes, user?.id]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    userNotes.forEach(n => n.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [userNotes]);

  const filteredNotes = useMemo(() => {
    let filtered = userNotes;

    if (showArchived) {
      filtered = filtered.filter(n => n.archivedAt);
    } else {
      filtered = filtered.filter(n => !n.archivedAt);
    }

    if (showPinnedOnly) {
      filtered = filtered.filter(n => n.isPinned);
    }

    if (filterTag) {
      filtered = filtered.filter(n => n.tags.includes(filterTag));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.body.toLowerCase().includes(query) ||
        n.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [userNotes, showArchived, showPinnedOnly, filterTag, searchQuery]);

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditBody(selectedNote.body);
      setEditTags(selectedNote.tags);
      setEditColor(selectedNote.color);
    }
  }, [selectedNote]);

  useEffect(() => {
    if (!selectedNote) return;

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      updateNote(selectedNote.id, {
        title: editTitle,
        body: editBody,
        tags: editTags,
        color: editColor,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
  }, [editTitle, editBody, editTags, editColor]);

  const handleCreateNote = () => {
    if (userNotes.length >= MAX_NOTES) {
      toast({
        title: 'Limit reached',
        description: `You can only have ${MAX_NOTES} notes.`,
        variant: 'destructive',
      });
      return;
    }

    const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: user!.id,
      title: 'Untitled Note',
      body: '',
      tags: [],
      isPinned: false,
    };

    addNote(newNote);
    const createdNote = notes[notes.length - 1];
    setSelectedNote(createdNote);
  };

  const handleTogglePin = () => {
    if (!selectedNote) return;
    updateNote(selectedNote.id, { isPinned: !selectedNote.isPinned });
    setSelectedNote({ ...selectedNote, isPinned: !selectedNote.isPinned });
  };

  const handleArchive = () => {
    if (!selectedNote) return;
    updateNote(selectedNote.id, { 
      archivedAt: selectedNote.archivedAt ? undefined : new Date() 
    });
    setSelectedNote(null);
    toast({
      title: selectedNote.archivedAt ? 'Unarchived' : 'Archived',
      description: 'Note updated.',
    });
  };

  const handleDelete = () => {
    if (!selectedNote) return;
    
    setDeletedNote(selectedNote);
    setSelectedNote(null);
    
    const timeout = setTimeout(() => {
      deleteNote(selectedNote.id);
      setDeletedNote(null);
    }, 5000);
    
    setUndoTimeout(timeout);
    
    toast({
      title: 'Deleted',
      description: 'Note deleted. Undo available for 5 seconds.',
      action: (
        <Button size="sm" variant="outline" onClick={handleUndo}>
          Undo
        </Button>
      ),
    });
  };

  const handleUndo = () => {
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }
    if (deletedNote) {
      setSelectedNote(deletedNote);
      setDeletedNote(null);
      toast({
        title: 'Restored',
        description: 'Note restored.',
      });
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim() || editTags.includes(newTag.trim())) {
      setNewTag('');
      return;
    }
    setEditTags([...editTags, newTag.trim()]);
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag));
  };

  const handleExport = () => {
    const data = JSON.stringify(userNotes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    toast({
      title: 'Exported',
      description: 'Notes exported to JSON.',
    });
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="modern-card p-6 mb-6 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Notes</h1>
              <p className="text-body mt-1">
                {userNotes.length}/{MAX_NOTES} notes
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleExport} variant="outline" className="modern-button-secondary">
                Export
              </Button>
              <Button onClick={handleCreateNote} className="modern-button" disabled={userNotes.length >= MAX_NOTES}>
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Notes List */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search & Filters */}
            <Card className="modern-card p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-body" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="pl-10 modern-input"
                />
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Button
                  size="sm"
                  variant={showPinnedOnly ? 'default' : 'outline'}
                  onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                  className="text-xs"
                >
                  <Pin className="h-3 w-3 mr-1" />
                  Pinned
                </Button>
                <Button
                  size="sm"
                  variant={showArchived ? 'default' : 'outline'}
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-xs"
                >
                  <Archive className="h-3 w-3 mr-1" />
                  Archived
                </Button>
              </div>
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={filterTag === tag ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* Notes List */}
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredNotes.length === 0 ? (
                <Card className="modern-card p-8 text-center">
                  <p className="text-body">
                    {userNotes.length === 0 ? 'Create your first note' : 'No notes found'}
                  </p>
                </Card>
              ) : (
                filteredNotes.map(note => (
                  <Card
                    key={note.id}
                    className={`modern-card p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedNote?.id === note.id ? 'ring-2 ring-indigo-500' : ''
                    }`}
                    style={{ backgroundColor: note.color }}
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-heading line-clamp-1">{note.title || 'Untitled'}</h3>
                      {note.isPinned && <Pin className="h-4 w-4 text-indigo-600 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-body line-clamp-2 mb-2">{note.body}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {note.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {note.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{note.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-body">
                        {format(note.updatedAt, 'MMM d')}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Right: Editor */}
          <div className="lg:col-span-2">
            {selectedNote ? (
              <Card className="modern-card p-6" style={{ backgroundColor: editColor }}>
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={handleTogglePin}>
                      <Pin className={`h-4 w-4 ${selectedNote.isPinned ? 'fill-current text-indigo-600' : ''}`} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleArchive}>
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleDelete} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex gap-1 ml-4">
                      {COLORS.map(c => (
                        <button
                          key={c.name}
                          className={`w-6 h-6 rounded-full border-2 ${
                            editColor === c.value ? 'border-indigo-600' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: c.value || '#fff' }}
                          onClick={() => setEditColor(c.value)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {saveStatus === 'saving' && (
                      <span className="text-sm text-body">Saving...</span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <Check className="h-4 w-4" /> Saved
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Note title..."
                  className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-4 mb-4 bg-transparent"
                />

                {/* Tags */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add tag..."
                      className="modern-input h-8 text-sm bg-transparent"
                    />
                    <Button size="sm" onClick={handleAddTag} className="h-8">
                      <Tag className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Body */}
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Start writing..."
                  className="min-h-[500px] border-none shadow-none focus-visible:ring-0 px-4 resize-none bg-transparent"
                />
              </Card>
            ) : (
              <Card className="modern-card p-16 text-center">
                <p className="text-heading text-lg font-bold mb-2">No note selected</p>
                <p className="text-body">Select a note from the list or create a new one</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
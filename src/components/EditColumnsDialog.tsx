import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { KanbanColumn } from '@/types';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useData } from '@/contexts/DataContext';

interface EditColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: KanbanColumn[];
  onSave: (columns: KanbanColumn[]) => void;
  tasksInColumns?: Record<string, number>;
  channelId: string;
}

export default function EditColumnsDialog({
  open,
  onOpenChange,
  columns,
  onSave,
  tasksInColumns = {},
  channelId,
}: EditColumnsDialogProps) {
  const { toast } = useToast();
  const { tasks, updateTask } = useData();
  const [editedColumns, setEditedColumns] = useState<KanbanColumn[]>(columns);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  const [moveToColumnId, setMoveToColumnId] = useState<string>('');

  useEffect(() => {
    setEditedColumns(columns);
  }, [columns]);

  const handleNameChange = (id: string, newName: string) => {
    setEditedColumns(
      editedColumns.map((col) =>
        col.id === id ? { ...col, name: newName } : col
      )
    );
  };

  const handleDelete = (id: string) => {
    const tasksCount = tasksInColumns[id] || 0;
    if (tasksCount > 0) {
      setDeleteColumnId(id);
    } else {
      setEditedColumns(editedColumns.filter((col) => col.id !== id));
      toast({
        title: "Saved",
        description: "Column has been removed.",
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteColumnId || !moveToColumnId) return;
    
    // Move all tasks from deleted column to destination column
    const tasksToMove = tasks.filter(t => t.channelId === channelId && t.columnId === deleteColumnId);
    tasksToMove.forEach(task => {
      updateTask(task.id, { columnId: moveToColumnId });
    });
    
    const newColumns = editedColumns.filter((col) => col.id !== deleteColumnId);
    setEditedColumns(newColumns);
    
    // Save immediately
    onSave(newColumns.map((col, idx) => ({ ...col, order: idx })));
    
    setDeleteColumnId(null);
    setMoveToColumnId('');
    
    toast({
      title: "Saved",
      description: "Column deleted and tasks moved.",
    });
  };

  const handleAdd = () => {
    const newColumn: KanbanColumn = {
      id: `col-${Date.now()}`,
      name: 'New Column',
      order: editedColumns.length,
    };
    const newColumns = [...editedColumns, newColumn];
    setEditedColumns(newColumns);
    
    // Auto-save when adding
    onSave(newColumns);
    
    toast({
      title: "Saved",
      description: "New column has been created.",
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newColumns = [...editedColumns];
    const draggedItem = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedItem);

    setEditedColumns(newColumns.map((col, idx) => ({ ...col, order: idx })));
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    // Auto-save on reorder
    onSave(editedColumns);
    
    toast({
      title: "Saved",
      description: "Column order updated.",
    });
  };

  const handleSave = () => {
    onSave(editedColumns);
    onOpenChange(false);
    
    toast({
      title: "Saved",
      description: "All changes saved.",
    });
  };

  const handleBlur = () => {
    // Auto-save on blur (after rename)
    onSave(editedColumns);
    
    toast({
      title: "Saved",
      description: "Column renamed.",
    });
  };

  const columnToDelete = editedColumns.find(c => c.id === deleteColumnId);
  const otherColumns = editedColumns.filter(c => c.id !== deleteColumnId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] modern-modal">
          <DialogHeader>
            <DialogTitle className="text-heading text-xl">Edit Columns</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {editedColumns.map((column, index) => (
              <div
                key={column.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 p-3 glass-card cursor-move hover:border-purple-500/40 transition-all ${
                  draggedIndex === index ? 'opacity-50 scale-95' : ''
                }`}
              >
                <GripVertical className="h-5 w-5 text-white/50 flex-shrink-0" />
                <Input
                  value={column.name}
                  onChange={(e) => handleNameChange(column.id, e.target.value)}
                  onBlur={handleBlur}
                  className="flex-1 modern-input"
                  placeholder="Column name"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(column.id)}
                  className="flex-shrink-0 icon-button hover:bg-red-500/20 hover:border-red-500/40"
                  disabled={editedColumns.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={handleAdd}
              className="flex-1 modern-button-secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
            <Button onClick={handleSave} className="flex-1 modern-button-primary">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Column with Tasks Dialog */}
      <AlertDialog open={!!deleteColumnId} onOpenChange={(open) => !open && setDeleteColumnId(null)}>
        <AlertDialogContent className="modern-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-heading">Move Tasks Before Deleting</AlertDialogTitle>
            <AlertDialogDescription className="text-body">
              The column "{columnToDelete?.name}" has {tasksInColumns[deleteColumnId || ''] || 0} task(s). 
              Please select a destination column to move them to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="text-label">Move tasks to:</Label>
            <Select value={moveToColumnId} onValueChange={setMoveToColumnId}>
              <SelectTrigger className="modern-input mt-2">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent className="modern-modal">
                {otherColumns.map(col => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="modern-button-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={!moveToColumnId}
              className="modern-button-primary bg-gradient-to-r from-red-500/35 to-red-600/35 hover:from-red-500/50 hover:to-red-600/50 border-red-500/40"
            >
              Move & Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
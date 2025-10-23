import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';
import { Task, CustomField } from '@/types';

interface MarkDoneDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function MarkDoneDialog({ task, open, onOpenChange, onConfirm }: MarkDoneDialogProps) {
  const { channels } = useData();
  const { toast } = useToast();

  const channel = channels.find(c => c.id === task.channelId);
  const customFields = channel?.customFields || [];
  const currentColumnIndex = channel?.columns.findIndex(col => col.id === task.columnId) ?? -1;
  const currentColumn = channel?.columns[currentColumnIndex];
  const nextColumn = currentColumnIndex >= 0 && currentColumnIndex < (channel?.columns.length ?? 0) - 1 
    ? channel?.columns[currentColumnIndex + 1] 
    : null;
  const isLastColumn = !nextColumn;

  // Check required fields
  const requiredFields = customFields.filter(f => 
    f.requiredInColumns?.includes(task.columnId)
  );
  
  const missingFields = requiredFields.filter(f => {
    const value = task.customFieldValues?.[f.id];
    return !value || (typeof value === 'string' && !value.trim());
  });

  const handleConfirm = () => {
    if (missingFields.length > 0) {
      toast({
        title: "Required fields missing",
        description: `Please complete: ${missingFields.map(f => f.name).join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="modern-modal">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold gradient-text">
            {isLastColumn ? 'Submit for Finalization' : 'Submit & Move Next'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-body">
            {isLastColumn ? (
              <>
                This task is in the final stage (<strong className="text-white">{currentColumn?.name}</strong>).
                <br />
                <span className="text-yellow-400 font-semibold">Your manager will finalize and complete this video.</span>
              </>
            ) : nextColumn ? (
              <>
                This will complete your work in <strong className="text-white">{currentColumn?.name}</strong> and move the task to <strong className="text-white">{nextColumn.name}</strong>.
              </>
            ) : (
              <>
                This will mark the task as Done in <strong className="text-white">{currentColumn?.name}</strong>.
              </>
            )}
            {missingFields.length > 0 && (
              <div className="mt-3 p-3 modern-card border-2 border-red-500/40 bg-gradient-to-br from-red-500/10 to-pink-500/10">
                <strong className="text-red-400">Missing required fields:</strong>
                <ul className="list-disc list-inside mt-1 text-body">
                  {missingFields.map(f => (
                    <li key={f.id}>{f.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="modern-button modern-button-secondary">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={missingFields.length > 0}
            className="modern-button bg-gradient-to-r from-green-500/40 to-emerald-500/40 hover:from-green-500/60 hover:to-emerald-500/60 border-green-500/40"
          >
            {isLastColumn ? 'Submit' : 'Submit & Move Next'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
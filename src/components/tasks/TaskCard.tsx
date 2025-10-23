import React, { useState } from 'react';
import { Task, CustomField } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, User, CheckCircle2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import TaskModal from './TaskModal';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import CompleteTaskDialog from './CompleteTaskDialog';
import MarkDoneDialog from './MarkDoneDialog';

interface TaskCardProps {
  task: Task;
  onDragStart: () => void;
}

export default function TaskCard({ task, onDragStart }: TaskCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showMarkDone, setShowMarkDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { channels, users, updateTask } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const channel = channels.find(c => c.id === task.channelId);
  const customFields = channel?.customFields || [];
  const visibleFields = customFields.filter(f => f.showOnCardFront);
  const fieldValues = task.customFieldValues || {};
  const assignedUser = users.find(u => u.id === task.assignedTo);

  const currentColumnIndex = channel?.columns.findIndex(col => col.id === task.columnId) ?? -1;
  const isLastColumn = currentColumnIndex === (channel?.columns.length ?? 0) - 1;
  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'channel_manager';

  const handleDragStart = () => {
    setIsDragging(true);
    onDragStart();
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const renderFieldPreview = (field: CustomField) => {
    const value = fieldValues[field.id];
    if (!value && field.type !== 'checkbox') return null;

    let displayValue = '';
    let fullValue = '';

    switch (field.type) {
      case 'link':
        displayValue = field.name;
        fullValue = String(value);
        break;
      case 'checkbox':
        if (!value) return null;
        displayValue = field.name;
        fullValue = field.name;
        break;
      case 'date':
        displayValue = format(new Date(value), 'MMM d');
        fullValue = format(new Date(value), 'PPP');
        break;
      default:
        const strValue = String(value);
        displayValue = strValue.length > 15 ? strValue.substring(0, 15) + '...' : strValue;
        fullValue = strValue;
    }

    return (
      <TooltipProvider key={field.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="modern-badge text-xs max-w-[120px] truncate">
              {field.name.substring(0, 3)}: {displayValue}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="modern-modal">
            <p className="text-xs"><strong>{field.name}:</strong> {fullValue}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const displayedFields = visibleFields.slice(0, 2);
  const remainingCount = visibleFields.length - 2;

  const handleAdvance = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      if (!channel) {
        toast({
          title: "Error",
          description: "Channel not found.",
          variant: "destructive",
        });
        return;
      }

      const nextColumn = currentColumnIndex < channel.columns.length - 1 
        ? channel.columns[currentColumnIndex + 1] 
        : null;

      if (!nextColumn) {
        toast({
          title: "Awaiting finalization",
          description: "This task is in the final stage. Use 'Complete Video' to finalize.",
        });
        return;
      }

      // Advance to next column
      const nextColumnAssignment = channel.columnAssignments?.find(ca => ca.columnId === nextColumn.id);
      const nextAssignee = nextColumnAssignment?.assignedUserIds?.[0] || undefined;

      updateTask(task.id, { 
        columnId: nextColumn.id,
        assignedTo: nextAssignee,
        updatedAt: new Date(),
      });

      toast({
        title: "Task advanced",
        description: `Moved to ${nextColumn.name}${nextAssignee ? ` and assigned to ${users.find(u => u.id === nextAssignee)?.name || 'next user'}` : ' (Unassigned)'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to advance task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowMarkDone(false);
    }
  };

  const handleComplete = () => {
    toast({
      title: "Task completed",
      description: "Task moved to Completed Tasks.",
      variant: "success"
    });
  };

  // Determine button action
  const showCompleteButton = isLastColumn && isOwnerOrManager;
  const showAdvanceButton = !task.completed;

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`task-card-liquid group min-h-[160px] flex flex-col p-5 ${
          isDragging ? 'opacity-50 rotate-2 scale-105 shadow-2xl' : ''
        }`}
      >
        {/* Title - wraps to 2 lines max */}
        <div className="mb-4 flex-shrink-0">
          <h3 
            className="text-sm font-bold text-heading leading-tight line-clamp-2"
            style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
          >
            {task.title}
          </h3>
        </div>
        
        {/* Meta chips - single line with truncation */}
        <div className="flex flex-wrap gap-2 mb-auto">
          {task.dueDate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="modern-badge text-xs flex items-center gap-1 max-w-[100px] truncate">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    {format(task.dueDate, 'MMM d')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="modern-modal">
                  <p className="text-xs">Due: {format(task.dueDate, 'PPP')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {assignedUser && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="modern-badge text-xs flex items-center gap-1 max-w-[100px] truncate">
                    <User className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{assignedUser.name.split(' ')[0]}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="modern-modal">
                  <p className="text-xs">Assigned to: {assignedUser.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {displayedFields.map(field => renderFieldPreview(field))}
          
          {remainingCount > 0 && (
            <Badge variant="outline" className="modern-badge text-xs">
              +{remainingCount} more
            </Badge>
          )}
        </div>

        {/* Button bar - always visible, consistent styling */}
        <div className={`flex gap-2 pt-4 mt-4 border-t border-white/10 flex-shrink-0 ${isDragging ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
          {task.completed ? (
            <Button
              disabled
              className="flex-1 min-w-0 h-9 rounded-full text-xs font-semibold bg-white/10 text-white/50 border border-white/20 cursor-not-allowed"
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span className="truncate">Done</span>
            </Button>
          ) : showCompleteButton ? (
            <Button
              className="flex-1 min-w-0 h-9 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500/35 to-emerald-500/35 hover:from-green-500/50 hover:to-emerald-500/50 border border-green-500/40 text-white shadow-[0_4px_16px_rgba(34,197,94,0.25),0_0_15px_rgba(34,197,94,0.15)] hover:shadow-[0_6px_20px_rgba(34,197,94,0.35),0_0_20px_rgba(34,197,94,0.25)] transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation();
                setShowComplete(true);
              }}
              disabled={isProcessing}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span className="truncate">Complete Video</span>
            </Button>
          ) : showAdvanceButton ? (
            <Button
              className="flex-1 min-w-0 h-9 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500/35 to-pink-500/35 hover:from-purple-500/50 hover:to-pink-500/50 border border-purple-500/40 text-white shadow-[0_4px_16px_rgba(168,85,247,0.25),0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.35),0_0_20px_rgba(168,85,247,0.25)] transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation();
                setShowMarkDone(true);
              }}
              disabled={isProcessing}
            >
              {isLastColumn ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                  <span className="truncate">Submit</span>
                </>
              ) : (
                <>
                  <ArrowRight className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                  <span className="truncate">Mark Done</span>
                </>
              )}
            </Button>
          ) : null}
          
          <Button
            variant="outline"
            className="flex-1 min-w-0 h-9 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/25 hover:border-white/35 text-white/90 hover:text-white shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
          >
            <span className="truncate">Open</span>
          </Button>
        </div>
      </div>

      <TaskModal
        task={task}
        open={showModal}
        onOpenChange={setShowModal}
      />

      <CompleteTaskDialog
        task={task}
        open={showComplete}
        onOpenChange={setShowComplete}
        onComplete={handleComplete}
      />

      <MarkDoneDialog
        task={task}
        open={showMarkDone}
        onOpenChange={setShowMarkDone}
        onConfirm={handleAdvance}
      />
    </>
  );
}
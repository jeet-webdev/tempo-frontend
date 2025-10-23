import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useData } from '@/contexts/DataContext';
import { Channel, User } from '@/types';
import { Users, UserPlus, X, Crown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ChannelMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
}

export default function ChannelMembersDialog({ open, onOpenChange, channel }: ChannelMembersDialogProps) {
  const { users, updateChannel } = useData();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [managerId, setManagerId] = useState(channel.managerId || '');

  const channelMembers = users.filter(u => channel.members?.includes(u.id));
  const availableUsers = users.filter(u => !channel.members?.includes(u.id));

  const handleAddMember = () => {
    if (!selectedUserId) return;
    updateChannel(channel.id, {
      members: [...(channel.members || []), selectedUserId]
    });
    setSelectedUserId('');
    
    toast({
      title: "Saved",
      description: "Member added to channel.",
    });
  };

  const handleRemoveMember = (userId: string) => {
    updateChannel(channel.id, {
      members: (channel.members || []).filter(id => id !== userId)
    });
    if (managerId === userId) {
      setManagerId('');
      updateChannel(channel.id, { managerId: undefined });
    }
    
    toast({
      title: "Saved",
      description: "Member removed from channel.",
    });
  };

  const handleSetManager = (userId: string) => {
    const isCurrentManager = managerId === userId;
    
    if (isCurrentManager) {
      // Remove manager
      if (confirm('Remove this user as Channel Manager?')) {
        setManagerId('');
        updateChannel(channel.id, { managerId: undefined });
        
        toast({
          title: "Saved",
          description: "Manager removed from channel.",
        });
      }
    } else {
      // Set as manager
      setManagerId(userId);
      updateChannel(channel.id, { managerId: userId });
      
      toast({
        title: "Saved",
        description: "Channel manager updated. User can now access this board.",
      });
    }
  };

  const handleColumnAssignment = (columnId: string, userId: string, checked: boolean) => {
    const currentAssignments = channel.columnAssignments || [];
    const assignmentIndex = currentAssignments.findIndex(a => a.columnId === columnId);
    
    if (assignmentIndex === -1) {
      if (checked) {
        updateChannel(channel.id, {
          columnAssignments: [
            ...currentAssignments,
            { columnId, assignedUserIds: [userId] }
          ]
        });
      }
    } else {
      const assignment = currentAssignments[assignmentIndex];
      const userIds = assignment.assignedUserIds || [];
      
      const newUserIds = checked
        ? [...userIds, userId]
        : userIds.filter(id => id !== userId);
      
      const newAssignments = [...currentAssignments];
      newAssignments[assignmentIndex] = {
        ...assignment,
        assignedUserIds: newUserIds
      };
      
      updateChannel(channel.id, { columnAssignments: newAssignments });
    }
    
    toast({
      title: "Saved",
      description: "Column assignment updated.",
    });
  };

  const isUserAssignedToColumn = (columnId: string, userId: string) => {
    const assignment = channel.columnAssignments?.find(a => a.columnId === columnId);
    return assignment?.assignedUserIds?.includes(userId) || false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 flex items-center justify-center relative overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <Users className="h-6 w-6 text-white relative z-10 drop-shadow-lg" />
              <div className="absolute inset-0 rounded-2xl border border-white/30"></div>
            </div>
            <div>
              <div className="text-heading">Channel Members</div>
              <div className="text-sm text-body font-normal">{channel.name}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Member */}
          <div className="glass-card p-6">
            <h3 className="text-label mb-4">Add Member</h3>
            <div className="flex gap-3">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddMember} disabled={!selectedUserId} className="shrink-0">
                <UserPlus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Members List */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-label">Members</h3>
              <span className="badge-liquid text-xs">{channelMembers.length}</span>
            </div>
            
            {channelMembers.length === 0 ? (
              <div className="empty-state py-8">
                <p className="text-body text-sm">No members yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {channelMembers.map(user => (
                  <div key={user.id} className="space-y-4">
                    <div className="glass-card p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 flex items-center justify-center relative overflow-hidden shadow-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                            <span className="text-white text-sm font-bold relative z-10 drop-shadow-lg">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                            <div className="absolute inset-0 rounded-2xl border border-white/30"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-bold text-heading text-sm truncate">{user.name}</div>
                              {managerId === user.id && (
                                <span className="badge-liquid text-xs flex items-center gap-1">
                                  <Crown className="h-3 w-3" />
                                  Manager
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted capitalize">{user.role.replace('_', ' ')}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant={managerId === user.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSetManager(user.id)}
                          >
                            {managerId === user.id ? "Remove Manager" : "Make Manager"}
                          </Button>
                          <button
                            onClick={() => handleRemoveMember(user.id)}
                            className="icon-btn-liquid w-9 h-9"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Column Assignments */}
                      <div className="pt-4 border-t border-white/10">
                        <Label className="mb-3 block">Column Assignments:</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {channel.columns.map(column => (
                            <div key={column.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${user.id}-${column.id}`}
                                checked={isUserAssignedToColumn(column.id, user.id)}
                                onCheckedChange={(checked) => 
                                  handleColumnAssignment(column.id, user.id, checked as boolean)
                                }
                              />
                              <label
                                htmlFor={`${user.id}-${column.id}`}
                                className="text-sm text-body cursor-pointer font-medium"
                              >
                                {column.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Channel } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';
import { Archive, Trash2, Edit2 } from 'lucide-react';

interface ChannelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  onDeleted?: () => void;
}

export default function ChannelSettingsDialog({ open, onOpenChange, channel, onDeleted }: ChannelSettingsDialogProps) {
  const { updateChannel, deleteChannel } = useData();
  const { toast } = useToast();
  
  const [channelName, setChannelName] = useState(channel.name);
  const [channelDescription, setChannelDescription] = useState(channel.description || '');
  const [youtubeChannelId, setYoutubeChannelId] = useState(channel.youtubeChannelId || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleRename = () => {
    if (!channelName.trim()) return;
    
    updateChannel(channel.id, {
      name: channelName.trim(),
      description: channelDescription.trim(),
      youtubeChannelId: youtubeChannelId.trim() || undefined,
    });

    toast({
      title: "Saved",
      description: "Channel updated successfully.",
    });
  };

  const handleArchive = () => {
    updateChannel(channel.id, {
      archived: !channel.archived,
    });

    toast({
      title: "Saved",
      description: channel.archived ? "Channel unarchived." : "Channel archived.",
    });
  };

  const handleDelete = () => {
    if (deleteConfirmText !== channel.name) {
      toast({
        title: "Error",
        description: "Channel name doesn't match.",
        variant: "destructive",
      });
      return;
    }

    deleteChannel(channel.id);
    setShowDeleteDialog(false);
    onOpenChange(false);
    
    toast({
      title: "Deleted",
      description: "Channel and all its tasks have been deleted.",
    });

    if (onDeleted) onDeleted();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="modern-modal max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold gradient-text">Channel Settings</DialogTitle>
            <p className="text-body text-sm mt-1">{channel.name}</p>
          </DialogHeader>

          <Tabs defaultValue="general" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="archive">Archive</TabsTrigger>
              <TabsTrigger value="danger">Danger Zone</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label className="text-heading text-sm font-semibold">Channel Name</Label>
                <Input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="modern-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-heading text-sm font-semibold">Description</Label>
                <Input
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  className="modern-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-heading text-sm font-semibold">YouTube Channel ID</Label>
                <Input
                  value={youtubeChannelId}
                  onChange={(e) => setYoutubeChannelId(e.target.value)}
                  placeholder="UCxxxxxxxxxxxxxxxxxx"
                  className="modern-input"
                />
                <p className="text-xs text-muted">
                  Find this in your YouTube channel URL or Studio settings. Used for analytics dashboard.
                </p>
              </div>
              <Button onClick={handleRename} className="modern-button modern-button-primary w-full">
                <Edit2 className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </TabsContent>

            <TabsContent value="archive" className="space-y-4 mt-6">
              <div className="modern-card p-6 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                <h3 className="font-semibold text-white text-lg mb-2">Archive Channel</h3>
                <p className="text-body text-sm mb-4">
                  {channel.archived 
                    ? "This channel is currently archived. Unarchive it to make it active again."
                    : "Archiving will hide this channel from normal lists and make the board read-only. You can unarchive it later."
                  }
                </p>
                <Button 
                  onClick={handleArchive}
                  className={channel.archived ? "modern-button modern-button-primary w-full" : "modern-button modern-button-secondary w-full"}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {channel.archived ? "Unarchive Channel" : "Archive Channel"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="danger" className="space-y-4 mt-6">
              <div className="modern-card p-6 border-red-500/30 bg-gradient-to-br from-red-500/10 to-pink-500/10">
                <h3 className="font-semibold text-white text-lg mb-2">Delete Channel</h3>
                <p className="text-body text-sm mb-4">
                  Permanently delete this channel and all its tasks, columns, and activity. This action cannot be undone.
                </p>
                <Button 
                  onClick={() => setShowDeleteDialog(true)}
                  className="modern-button w-full bg-gradient-to-r from-red-500/40 to-pink-500/40 hover:from-red-500/60 hover:to-pink-500/60 border-red-500/40"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Channel
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="modern-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-red-400">Delete this channel?</AlertDialogTitle>
            <AlertDialogDescription className="text-body">
              This will permanently delete <strong className="text-white">{channel.name}</strong> and all its tasks, columns, and activity. 
              This action cannot be undone.
              <div className="mt-4 space-y-2">
                <Label className="text-heading text-sm font-semibold">Type the channel name to confirm:</Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={channel.name}
                  className="modern-input"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')} className="modern-button modern-button-secondary">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleteConfirmText !== channel.name}
              className="modern-button bg-gradient-to-r from-red-500/40 to-pink-500/40 hover:from-red-500/60 hover:to-pink-500/60 border-red-500/40"
            >
              Delete Channel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
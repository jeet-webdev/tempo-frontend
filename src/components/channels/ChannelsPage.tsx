import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Archive, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ChannelCard from './ChannelCard';
import CreateChannelDialog from './CreateChannelDialog';
import { Channel } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface ChannelsPageProps {
  onChannelSelect?: (channel: Channel | null) => void;
}

export default function ChannelsPage({ onChannelSelect }: ChannelsPageProps) {
  const { user } = useAuth();
  const { channels, tasks, updateChannel, deleteChannel, users } = useData();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'newest' | 'active'>('name');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const isOwner = user?.role === 'owner';
  const managedChannelIds = channels.filter(c => c.managerId === user?.id).map(c => c.id);
  
  // Scope channels based on role and tab
  const scopedChannels = isOwner 
    ? channels.filter(c => activeTab === 'active' ? !c.archived : c.archived)
    : channels.filter(c => managedChannelIds.includes(c.id) && (activeTab === 'active' ? !c.archived : c.archived));

  // Filter and sort channels
  const filteredChannels = useMemo(() => {
    let filtered = scopedChannels.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'active':
        filtered.sort((a, b) => {
          const aCount = tasks.filter(t => t.channelId === a.id && !t.completed).length;
          const bCount = tasks.filter(t => t.channelId === b.id && !t.completed).length;
          return bCount - aCount;
        });
        break;
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [scopedChannels, searchQuery, sortBy, tasks]);

  const handleUnarchive = (channelId: string) => {
    updateChannel(channelId, { archived: false });
    toast({
      title: "Channel unarchived",
      description: "Channel has been restored to active channels.",
      variant: "success"
    });
  };

  const handleDelete = (channelId: string) => {
    if (confirm('Are you sure you want to permanently delete this channel? This action cannot be undone.')) {
      deleteChannel(channelId);
      toast({
        title: "Channel deleted",
        description: "Channel has been permanently deleted.",
        variant: "success"
      });
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* ... keep rest of code ... */}
      {/* Header */}
      <div className="max-w-full mx-auto mb-6">
        <div className="modern-card p-6 fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Channels</h1>
              <p className="text-body mt-1">{filteredChannels.length} channels</p>
            </div>
            {isOwner && activeTab === 'active' && (
              <Button 
                onClick={() => setShowCreateDialog(true)} 
                className="modern-button modern-button-primary h-10 px-4"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Channel
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-full mx-auto">
        <Card className="modern-card fade-in">
          <CardContent className="pt-6">
            {/* Controls */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search channels..."
                  className="modern-input w-full h-10"
                />
              </div>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-40 modern-input h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="modern-modal">
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="newest">Sort by Newest</SelectItem>
                  <SelectItem value="active">Sort by Most Active</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Channel Grid */}
            {filteredChannels.length === 0 ? (
              <div className="text-center py-16">
                {searchQuery ? (
                  <div>
                    <p className="text-heading text-lg font-bold mb-2">No channels found</p>
                    <p className="text-body">Try adjusting your search</p>
                  </div>
                ) : activeTab === 'archived' ? (
                  <div>
                    <Archive className="h-16 w-16 mx-auto mb-4 text-muted" />
                    <p className="text-heading text-lg font-bold mb-2">No archived channels</p>
                    <p className="text-body">Archived channels will appear here</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                      <Plus className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-heading text-lg font-bold mb-2">No channels yet</p>
                    <p className="text-body mb-6">Create your first channel to get started</p>
                    {isOwner && (
                      <Button 
                        onClick={() => setShowCreateDialog(true)} 
                        className="modern-button modern-button-primary h-12 px-6"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Create Channel
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : activeTab === 'archived' ? (
              <div className="space-y-4">
                {filteredChannels.map((channel) => {
                  const manager = users.find(u => u.id === channel.managerId);
                  return (
                    <div key={channel.id} className="modern-card p-6 hover:bg-white/5 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-heading">{channel.name}</h3>
                            <span className="badge-liquid text-xs inline-flex items-center gap-1">
                              <Archive className="h-3 w-3" />
                              Archived
                            </span>
                          </div>
                          {channel.description && (
                            <p className="text-body text-sm mb-3">{channel.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted">
                            <span>Archived: {format(channel.createdAt, 'MMM d, yyyy')}</span>
                            {manager && <span>Manager: {manager.name}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleUnarchive(channel.id)}
                            className="modern-button modern-button-secondary h-9 px-4 text-xs"
                          >
                            <Archive className="h-3 w-3 mr-1" />
                            Unarchive
                          </Button>
                          <Button
                            onClick={() => handleDelete(channel.id)}
                            variant="outline"
                            className="h-9 px-4 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChannels.map((channel) => (
                  <ChannelCard 
                    key={channel.id} 
                    channel={channel}
                    onClick={() => onChannelSelect?.(channel)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isOwner && (
        <CreateChannelDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      )}
    </div>
  );
}

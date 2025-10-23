import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Channel } from '@/types';
import { useData } from '@/contexts/DataContext';
import { Calendar, Users, Settings2, Archive, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import ChannelSettingsDialog from './ChannelSettingsDialog';

interface ChannelCardProps {
  channel: Channel;
  onClick: () => void;
}

export default function ChannelCard({ channel, onClick }: ChannelCardProps) {
  const { tasks, users } = useData();
  const [showSettings, setShowSettings] = useState(false);
  
  const channelTasks = tasks.filter(t => t.channelId === channel.id && !t.completed);
  const manager = users.find(u => u.id === channel.managerId);
  const memberCount = channel.members?.length || 0;

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(true);
  };

  return (
    <>
      <div 
        className="glass-card p-6 cursor-pointer group hover-lift fade-in"
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 flex items-center justify-center relative overflow-hidden shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <Activity className="h-6 w-6 text-white relative z-10 drop-shadow-lg" />
                <div className="absolute inset-0 rounded-2xl border border-white/30"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-heading mb-1">{channel.name}</h3>
                {channel.archived && (
                  <span className="badge-liquid text-xs inline-flex items-center gap-1">
                    <Archive className="h-3 w-3" />
                    Archived
                  </span>
                )}
              </div>
            </div>
            {channel.description && (
              <p className="text-body text-sm line-clamp-2">{channel.description}</p>
            )}
          </div>
          <button
            onClick={handleSettingsClick}
            className="icon-btn-liquid opacity-0 group-hover:opacity-100 transition-opacity duration-250"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg" style={{ boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)' }}></div>
            <span className="text-sm font-semibold text-heading">{channelTasks.length}</span>
            <span className="text-xs text-muted">active</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-body" />
            <span className="text-sm font-semibold text-heading">{memberCount}</span>
            <span className="text-xs text-muted">members</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          {manager && (
            <span className="badge-liquid text-xs">
              {manager.name}
            </span>
          )}
          <span className="text-xs text-muted">
            {format(channel.createdAt, 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      <ChannelSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        channel={channel}
      />
    </>
  );
}
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  LayoutGrid, 
  BarChart3, 
  Clock, 
  Star,
  ChevronLeft,
  ChevronRight,
  Settings,
  User,
  LogOut,
  PlayCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ThemeToggle from './ThemeToggle';
import SettingsPage from './SettingsPage';
import UserProfileDialog from './UserProfileDialog';

interface SidebarProps {
  onNavigate: (path: string) => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { channels, appSettings, updateUser } = useData();
  const location = useLocation();

  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const managedChannels = channels.filter(c => c.managerId === user?.id);
  const isOwner = user?.role === 'owner';
  const isChannelManager = user?.role === 'channel_manager' || managedChannels.length > 0;

  const menuItems = [
    { 
      icon: Home, 
      label: 'Dashboard', 
      path: '/',
      show: true 
    },
    { 
      icon: LayoutGrid, 
      label: 'Channels', 
      path: '/channels',
      show: isOwner || isChannelManager
    },
    { 
      icon: BarChart3, 
      label: 'Manager Analytics', 
      path: '/manager-analytics',
      show: isChannelManager && !isOwner
    },
    { 
      icon: BarChart3, 
      label: 'Command Center', 
      path: '/analytics',
      show: isOwner 
    },
    { 
      icon: PlayCircle, 
      label: 'YouTube Analytics', 
      path: '/youtube-analytics',
      show: isOwner 
    },
    { 
      icon: Clock, 
      label: 'OT Log', 
      path: '/ot-log',
      show: isOwner 
    },
    { 
      icon: Star, 
      label: 'Bookmarks', 
      path: '/bookmarks',
      show: appSettings.bookmarksEnabled 
    },
  ].filter(item => item.show);

  const isActive = (path: string) => location.pathname === path;

  return (
    <TooltipProvider>
      <div 
        className="fixed left-0 top-0 h-screen sidebar-liquid transition-all duration-500 z-50 flex flex-col items-center py-8"
        style={{ width: '80px' }}
      >
        {/* Logo - Glowing */}
        <div className="mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 flex items-center justify-center shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <span className="text-white font-bold text-2xl relative z-10 drop-shadow-lg">P</span>
            <div className="absolute inset-0 rounded-2xl border border-white/30"></div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 flex flex-col items-center gap-4 w-full px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onNavigate(item.path)}
                    className={`icon-btn-liquid ${active ? 'active' : ''}`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="tooltip-liquid">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-4 w-full px-4 pt-6 border-t border-white/10">
          
          {/* Settings - Owner Only */}
          {isOwner && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowSettings(true)}
                  className="icon-btn-liquid"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="tooltip-liquid">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowProfile(true)}
                className="icon-btn-liquid"
              >
                <User className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="tooltip-liquid">
              <p>Profile</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="icon-btn-liquid hover:bg-red-500/20 hover:border-red-400/50"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="tooltip-liquid">
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Settings Modal - Owner Only */}
      {isOwner && <SettingsPage open={showSettings} onOpenChange={setShowSettings} />}

      {/* Profile Modal */}
      {user && (
        <UserProfileDialog 
          userId={user.id} 
          open={showProfile} 
          onOpenChange={setShowProfile} 
        />
      )}
    </TooltipProvider>
  );
}
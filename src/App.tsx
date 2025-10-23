import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginPage from './components/LoginPage';
import OwnerDashboard from './components/dashboards/OwnerDashboard';
import ChannelManagerDashboard from './components/dashboards/ChannelManagerDashboard';
import EmployeeDashboard from './components/dashboards/EmployeeDashboard';
import NoAccessPage from './components/NoAccessPage';
import BookmarksPage from './components/BookmarksPage';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ManagerAnalyticsDashboard from './components/ManagerAnalyticsDashboard';
import OTLogPage from './components/OTLogPage';
import KanbanBoard from './components/KanbanBoard';
import Sidebar from './components/Sidebar';
import { Toaster } from './components/ui/toaster';
import { Channel } from './types';
import ChannelsPage from './components/channels/ChannelsPage';
import OwnerAnalyticsPage from './components/OwnerAnalyticsPage';
import YouTubeAnalyticsPage from './components/YouTubeAnalyticsPage';
import './index.css';

function AppContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        // Quick switcher - can be implemented later
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [navigate]);

  if (!user) {
    return <LoginPage />;
  }

  const handleNavigate = (path: string) => {
    setSelectedChannel(null);
    navigate(path);
  };

  const handleChannelSelect = (channel: Channel | null) => {
    setSelectedChannel(channel);
  };

  const isOwner = user.role === 'owner';
  const isChannelManager = user.role === 'channel_manager';
  const isEmployee = !isOwner && !isChannelManager;

  if (selectedChannel) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar onNavigate={handleNavigate} />
        <main 
          className="flex-1 overflow-auto transition-all duration-300"
          style={{ marginLeft: 'var(--sidebar-width)' }}
        >
          <KanbanBoard channel={selectedChannel} onBack={() => setSelectedChannel(null)} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onNavigate={handleNavigate} />
      <main 
        className="flex-1 overflow-auto transition-all duration-300"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <Routes>
          <Route path="/" element={
            isOwner ? (
              <OwnerDashboard onChannelSelect={handleChannelSelect} />
            ) : isChannelManager ? (
              <ChannelManagerDashboard onChannelSelect={handleChannelSelect} />
            ) : (
              <EmployeeDashboard />
            )
          } />
          <Route path="/channels" element={
            isOwner || isChannelManager ? (
              <ChannelsPage onChannelSelect={handleChannelSelect} />
            ) : (
              <Navigate to="/" replace />
            )
          } />
          <Route path="/analytics" element={
            isOwner ? (
              <OwnerAnalyticsPage />
            ) : (
              <Navigate to="/" replace />
            )
          } />
          <Route path="/youtube-analytics" element={
            isOwner ? (
              <YouTubeAnalyticsPage />
            ) : (
              <Navigate to="/" replace />
            )
          } />
          <Route path="/manager-analytics" element={
            isChannelManager && !isOwner ? (
              <ManagerAnalyticsDashboard onBack={() => navigate('/')} />
            ) : (
              <Navigate to="/" replace />
            )
          } />
          <Route path="/ot-log" element={
            isOwner ? (
              <OTLogPage onBack={() => navigate('/')} />
            ) : (
              <Navigate to="/" replace />
            )
          } />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/no-access" element={<NoAccessPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <Router>
            <AppContent />
            <Toaster />
          </Router>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
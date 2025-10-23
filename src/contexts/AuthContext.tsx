import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Mock users for demo with passwords
const MOCK_USERS: Record<UserRole, User> = {
  owner: {
    id: 'owner-1',
    email: 'owner@pc.local',
    name: 'Sarah Johnson',
    employeeCode: 'EMP001',
    role: 'owner',
    password: 'owner123',
  },
  channel_manager: {
    id: 'manager-1',
    email: 'manager@pc.local',
    name: 'Mike Chen',
    employeeCode: 'EMP002',
    role: 'channel_manager',
    assignedChannels: ['1'],
    password: 'manager123',
  },
  script_writer: {
    id: 'script-1',
    email: 'script@pc.local',
    name: 'Alex Rivera',
    employeeCode: 'EMP003',
    role: 'script_writer',
    password: 'script123',
  },
  audio_editor: {
    id: 'audio-1',
    email: 'audio@pc.local',
    name: 'Jordan Lee',
    employeeCode: 'EMP004',
    role: 'audio_editor',
    password: 'audio123',
  },
  video_editor: {
    id: 'video-1',
    email: 'video@pc.local',
    name: 'Taylor Smith',
    employeeCode: 'EMP005',
    role: 'video_editor',
    password: 'video123',
  },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Get all users from localStorage
        const storedUsers = localStorage.getItem('passive_users_data');
        let allUsers: User[] = Object.values(MOCK_USERS);
        
        if (storedUsers) {
          try {
            allUsers = JSON.parse(storedUsers);
          } catch (e) {
            console.error('Error parsing users:', e);
          }
        }
        
        // Find user by email
        const foundUser = allUsers.find(u => u.email === email);
        
        if (foundUser && foundUser.password === password && foundUser.active !== false) {
          setUser(foundUser);
          setLoading(false);
          resolve(true);
        } else {
          setLoading(false);
          resolve(false);
        }
      }, 500);
    });
  };

  const logout = () => {
    setUser(null);
  };

  const switchUser = (role: UserRole) => {
    setUser(MOCK_USERS[role]);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
};
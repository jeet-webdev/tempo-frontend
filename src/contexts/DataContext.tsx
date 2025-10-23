import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Channel, Task, User, Role, DEFAULT_COLUMNS, DEFAULT_ROLES, OTEntry, AppSettings, CompletedTask, StageEvent } from '@/types';
import { STORAGE_KEYS } from '@/constants';

interface DataContextType {
  channels: Channel[];
  tasks: Task[];
  users: User[];
  roles: Role[];
  otEntries: OTEntry[];
  completedTasks: CompletedTask[];
  stageEvents: StageEvent[];
  appSettings: AppSettings;
  addChannel: (channel: Omit<Channel, 'id' | 'createdAt'>) => void;
  updateChannel: (id: string, updates: Partial<Channel>) => void;
  deleteChannel: (id: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  removeUser: (id: string) => void;
  addRole: (role: Omit<Role, 'id'>) => void;
  removeRole: (id: string) => void;
  addOTEntry: (entry: Omit<OTEntry, 'id' | 'createdAt'>) => void;
  updateOTEntry: (id: string, updates: Partial<OTEntry>) => void;
  deleteOTEntry: (id: string) => void;
  addCompletedTask: (task: Omit<CompletedTask, 'id' | 'completedAt'>) => void;
  addStageEvent: (event: Omit<StageEvent, 'id' | 'occurredAt'>) => void;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

const DEFAULT_USERS: User[] = [
  {
    id: 'owner-1',
    email: 'owner@passive.com',
    name: 'Admin Owner',
    employeeCode: 'OWN001',
    role: 'owner',
    password: 'admin123',
    active: true,
  },
  {
    id: 'manager-1',
    email: 'manager@passive.com',
    name: 'Channel Manager',
    employeeCode: 'MGR001',
    role: 'channel_manager',
    password: 'manager123',
    active: true,
  },
  {
    id: 'script-1',
    email: 'script@passive.com',
    name: 'Script Writer',
    employeeCode: 'SCR001',
    role: 'script_writer',
    password: 'script123',
    active: true,
  },
];

const DEFAULT_CHANNELS: Channel[] = [
  {
    id: '1',
    name: 'Tech Reviews',
    description: 'Latest gadget reviews and tech news',
    columns: DEFAULT_COLUMNS,
    customFields: [],
    createdAt: new Date(),
    managerId: 'manager-1',
    members: ['manager-1', 'script-1'],
    columnAssignments: [],
    archived: false,
  },
];

const DEFAULT_TASKS: Task[] = [
  {
    id: '1',
    title: 'iPhone 15 Pro Review Script',
    description: 'Write comprehensive review covering camera, performance, and battery',
    channelId: '1',
    columnId: 'script',
    assignedTo: 'script-1',
    dueDate: new Date(Date.now() + 86400000),
    notes: [],
    links: [],
    customFieldValues: {},
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const DEFAULT_APP_SETTINGS: AppSettings = {
  bookmarksEnabled: true,
};

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return JSON.parse(stored, (key, value) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value);
        }
        return value;
      });
    }
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
  }
  return defaultValue;
};

const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [channels, setChannels] = useState<Channel[]>(() => 
    loadFromStorage(STORAGE_KEYS.CHANNELS, DEFAULT_CHANNELS)
  );
  const [tasks, setTasks] = useState<Task[]>(() => 
    loadFromStorage(STORAGE_KEYS.TASKS, DEFAULT_TASKS)
  );
  const [users, setUsers] = useState<User[]>(() => 
    loadFromStorage(STORAGE_KEYS.USERS, DEFAULT_USERS)
  );
  const [roles, setRoles] = useState<Role[]>(() => 
    loadFromStorage(STORAGE_KEYS.ROLES, DEFAULT_ROLES)
  );
  const [otEntries, setOTEntries] = useState<OTEntry[]>(() => 
    loadFromStorage(STORAGE_KEYS.OT_ENTRIES, [])
  );
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>(() => 
    loadFromStorage(STORAGE_KEYS.COMPLETED_TASKS, [])
  );
  const [stageEvents, setStageEvents] = useState<StageEvent[]>(() => 
    loadFromStorage(STORAGE_KEYS.STAGE_EVENTS, [])
  );
  const [appSettings, setAppSettings] = useState<AppSettings>(() => 
    loadFromStorage(STORAGE_KEYS.APP_SETTINGS, DEFAULT_APP_SETTINGS)
  );

  // Persist to localStorage whenever data changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CHANNELS, channels);
  }, [channels]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TASKS, tasks);
  }, [tasks]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.USERS, users);
  }, [users]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ROLES, roles);
  }, [roles]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.OT_ENTRIES, otEntries);
  }, [otEntries]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.COMPLETED_TASKS, completedTasks);
  }, [completedTasks]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.STAGE_EVENTS, stageEvents);
  }, [stageEvents]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.APP_SETTINGS, appSettings);
  }, [appSettings]);

  const addChannel = (channel: Omit<Channel, 'id' | 'createdAt'>) => {
    const newChannel: Channel = {
      ...channel,
      id: `channel-${Date.now()}`,
      createdAt: new Date(),
    };
    setChannels([...channels, newChannel]);
  };

  const updateChannel = (id: string, updates: Partial<Channel>) => {
    setChannels(channels.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteChannel = (id: string) => {
    setChannels(channels.filter(c => c.id !== id));
  };

  const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const addUser = (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
    };
    setUsers([...users, newUser]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const removeUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const addRole = (role: Omit<Role, 'id'>) => {
    const newRole: Role = {
      ...role,
      id: `role-${Date.now()}`,
    };
    setRoles([...roles, newRole]);
  };

  const removeRole = (id: string) => {
    setRoles(roles.filter(r => r.id !== id));
  };

  const addOTEntry = (entry: Omit<OTEntry, 'id' | 'createdAt'>) => {
    const newEntry: OTEntry = {
      ...entry,
      id: `ot-${Date.now()}`,
      createdAt: new Date(),
    };
    setOTEntries([...otEntries, newEntry]);
  };

  const updateOTEntry = (id: string, updates: Partial<OTEntry>) => {
    setOTEntries(otEntries.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteOTEntry = (id: string) => {
    setOTEntries(otEntries.filter(e => e.id !== id));
  };

  const addCompletedTask = (task: Omit<CompletedTask, 'id' | 'completedAt'>) => {
    const newCompletedTask: CompletedTask = {
      ...task,
      id: `completed-${Date.now()}`,
      completedAt: new Date(),
    };
    setCompletedTasks([...completedTasks, newCompletedTask]);
  };

  const addStageEvent = (event: Omit<StageEvent, 'id' | 'occurredAt'>) => {
    const newEvent: StageEvent = {
      ...event,
      id: `stage-${Date.now()}`,
      occurredAt: new Date(),
    };
    setStageEvents([...stageEvents, newEvent]);
  };

  const updateAppSettings = (settings: Partial<AppSettings>) => {
    setAppSettings(prev => ({ ...prev, ...settings }));
  };

  return (
    <DataContext.Provider
      value={{
        channels,
        tasks,
        users,
        roles,
        otEntries,
        completedTasks,
        stageEvents,
        appSettings,
        addChannel,
        updateChannel,
        deleteChannel,
        addTask,
        updateTask,
        deleteTask,
        addUser,
        updateUser,
        removeUser,
        addRole,
        removeRole,
        addOTEntry,
        updateOTEntry,
        deleteOTEntry,
        addCompletedTask,
        addStageEvent,
        updateAppSettings,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
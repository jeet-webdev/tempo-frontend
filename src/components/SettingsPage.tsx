import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { useData } from '@/contexts/DataContext';
import { User, Role, UserRole } from '@/types';
import { Plus, Trash2, Users, Tag, Edit2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SettingsPageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsPage({ open, onOpenChange }: SettingsPageProps) {
  const { users, roles, addUser, updateUser, removeUser, addRole, removeRole, appSettings, updateAppSettings } = useData();
  const { toast } = useToast();
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCode, setNewUserCode] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('script_writer');
  const [newUserPassword, setNewUserPassword] = useState('');
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  
  const [newRoleName, setNewRoleName] = useState('');
  const [youtubeApiKey, setYoutubeApiKey] = useState(localStorage.getItem('youtubeApiKey') || '');

  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserCode.trim() || !newUserPassword.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields including password.",
        variant: "destructive",
      });
      return;
    }
    
    addUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      employeeCode: newUserCode.trim(),
      role: newUserRole,
      password: newUserPassword,
      active: true,
    });
    
    setNewUserName('');
    setNewUserEmail('');
    setNewUserCode('');
    setNewUserRole('script_writer');
    setNewUserPassword('');
    
    toast({
      title: "Saved",
      description: `${newUserName} has been added with password set.`,
    });
  };

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user });
    setEditPassword('');
  };

  const handleSaveEditUser = () => {
    if (!editingUser) return;
    
    const updates: Partial<User> = {
      name: editingUser.name,
      email: editingUser.email,
      employeeCode: editingUser.employeeCode,
      role: editingUser.role,
      active: editingUser.active,
      otHalfDayRate: editingUser.otHalfDayRate,
      otFullDayRate: editingUser.otFullDayRate,
    };
    
    // Only update password if a new one was entered
    if (editPassword.trim()) {
      updates.password = editPassword;
    }
    
    updateUser(editingUser.id, updates);
    
    setEditingUser(null);
    setEditPassword('');
    
    toast({
      title: "Saved",
      description: editPassword ? "User details and password updated." : "User details updated.",
    });
  };

  const handleDeleteUser = () => {
    if (!deleteUserId) return;
    
    removeUser(deleteUserId);
    setDeleteUserId(null);
    
    toast({
      title: "Saved",
      description: "User has been removed.",
    });
  };

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    
    addRole({
      name: newRoleName.trim(),
    });
    
    setNewRoleName('');
    
    toast({
      title: "Saved",
      description: `${newRoleName} role created.`,
    });
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('youtubeApiKey', youtubeApiKey);
    toast({
      title: "Saved",
      description: "YouTube API Key saved successfully.",
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="people" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="people">
                <Users className="h-4 w-4 mr-2" />
                People
              </TabsTrigger>
              <TabsTrigger value="roles">
                <Tag className="h-4 w-4 mr-2" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="features">
                Features
              </TabsTrigger>
              <TabsTrigger value="integrations">
                Integrations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="people" className="flex-1 overflow-y-auto space-y-4 mt-4">
              {/* Add User Form */}
              <Card className="modern-card">
                <CardHeader>
                  <CardTitle className="text-base text-heading">Add New User</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="userName" className="text-heading">Name</Label>
                      <Input
                        id="userName"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="John Doe"
                        className="modern-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userEmail" className="text-heading">Email</Label>
                      <Input
                        id="userEmail"
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="modern-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="userCode" className="text-heading">Employee Code</Label>
                      <Input
                        id="userCode"
                        value={newUserCode}
                        onChange={(e) => setNewUserCode(e.target.value)}
                        placeholder="EMP006"
                        className="modern-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userRole" className="text-heading">Role</Label>
                      <Select value={newUserRole} onValueChange={(value: UserRole) => setNewUserRole(value)}>
                        <SelectTrigger className="modern-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="modern-modal">
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="channel_manager">Channel Manager</SelectItem>
                          <SelectItem value="script_writer">Script Writer</SelectItem>
                          <SelectItem value="audio_editor">Audio Editor</SelectItem>
                          <SelectItem value="video_editor">Video Editor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userPassword" className="text-heading">Password</Label>
                    <Input
                      id="userPassword"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Set password for this user"
                      className="modern-input"
                    />
                  </div>
                  <Button onClick={handleAddUser} className="w-full modern-button modern-button-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </CardContent>
              </Card>

              {/* Users List */}
              <Card className="modern-card">
                <CardHeader>
                  <CardTitle className="text-base text-heading">All Users ({users.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {users.length === 0 ? (
                    <p className="text-sm text-body text-center py-4">No users yet</p>
                  ) : (
                    users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 modern-card"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-heading">{user.name}</div>
                          <div className="text-sm text-body">{user.email}</div>
                          <div className="text-xs text-muted mt-1">
                            {user.employeeCode} • {user.role.replace('_', ' ')} • {user.active !== false ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            className="icon-button w-10 h-10"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteUserId(user.id)}
                            className="icon-button w-10 h-10 hover:bg-red-500/20 hover:border-red-500/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles" className="flex-1 overflow-y-auto space-y-4 mt-4">
              {/* Add Role Form */}
              <Card className="modern-card">
                <CardHeader>
                  <CardTitle className="text-base text-heading">Add New Role</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="roleName" className="text-heading">Role Name</Label>
                    <Input
                      id="roleName"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="e.g., Thumbnail Designer"
                      className="modern-input"
                    />
                  </div>
                  <Button onClick={handleAddRole} className="w-full modern-button modern-button-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Role
                  </Button>
                </CardContent>
              </Card>

              {/* Roles List */}
              <Card className="modern-card">
                <CardHeader>
                  <CardTitle className="text-base text-heading">All Roles ({roles.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {roles.length === 0 ? (
                    <p className="text-sm text-body text-center py-4">No custom roles yet</p>
                  ) : (
                    roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-3 modern-card"
                      >
                        <div className="font-medium text-heading">{role.name}</div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRole(role.id)}
                          className="icon-button w-10 h-10 hover:bg-red-500/20 hover:border-red-500/40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="flex-1 overflow-y-auto space-y-4 mt-4">
              <Card className="modern-card">
                <CardHeader>
                  <CardTitle className="text-base text-heading">Feature Toggles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 modern-card">
                    <div>
                      <div className="font-medium text-heading">Bookmarks</div>
                      <div className="text-sm text-body">Enable bookmarks for all users</div>
                    </div>
                    <Switch
                      checked={appSettings.bookmarksEnabled}
                      onCheckedChange={(checked) => updateAppSettings({ bookmarksEnabled: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations" className="flex-1 overflow-y-auto space-y-4 mt-4">
              <Card className="modern-card">
                <CardHeader>
                  <CardTitle className="text-base text-heading">YouTube Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="youtubeApiKey" className="text-heading">YouTube API Key</Label>
                    <Input
                      id="youtubeApiKey"
                      type="password"
                      value={youtubeApiKey}
                      onChange={(e) => setYoutubeApiKey(e.target.value)}
                      placeholder="Enter your YouTube Data API v3 key"
                      className="modern-input"
                    />
                    <p className="text-xs text-muted">
                      Get your API key from{' '}
                      <a 
                        href="https://console.cloud.google.com/apis/credentials" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 underline"
                      >
                        Google Cloud Console
                      </a>
                      . Enable YouTube Data API v3 for your project.
                    </p>
                  </div>
                  <Button onClick={handleSaveApiKey} className="w-full modern-button modern-button-primary">
                    Save API Key
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-heading">Name</Label>
                <Input
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="modern-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-heading">Email</Label>
                <Input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="modern-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-heading">Employee Code</Label>
                <Input
                  value={editingUser.employeeCode}
                  onChange={(e) => setEditingUser({ ...editingUser, employeeCode: e.target.value })}
                  className="modern-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-heading">Role</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value: UserRole) => setEditingUser({ ...editingUser, role: value })}
                >
                  <SelectTrigger className="modern-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="modern-modal">
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="channel_manager">Channel Manager</SelectItem>
                    <SelectItem value="script_writer">Script Writer</SelectItem>
                    <SelectItem value="audio_editor">Audio Editor</SelectItem>
                    <SelectItem value="video_editor">Video Editor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* OT Details Section */}
              <div className="space-y-4 p-4 modern-card border-2 border-purple-500/30">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full"></div>
                  <Label className="text-base font-bold text-heading">Overtime Details (Editable by Owner only)</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="otHalfDay" className="text-heading">Half Day OT Amount (₹)</Label>
                    <Input
                      id="otHalfDay"
                      type="number"
                      step="50"
                      min="0"
                      value={editingUser.otHalfDayRate ?? ''}
                      onChange={(e) => setEditingUser({ ...editingUser, otHalfDayRate: e.target.value ? Number(e.target.value) : undefined })}
                      className="modern-input"
                      placeholder="e.g., 500"
                    />
                    <p className="text-xs text-muted">Amount paid for half-day OT</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otFullDay" className="text-heading">Full Day OT Amount (₹)</Label>
                    <Input
                      id="otFullDay"
                      type="number"
                      step="50"
                      min="0"
                      value={editingUser.otFullDayRate ?? ''}
                      onChange={(e) => setEditingUser({ ...editingUser, otFullDayRate: e.target.value ? Number(e.target.value) : undefined })}
                      className="modern-input"
                      placeholder="e.g., 1000"
                    />
                    <p className="text-xs text-muted">Amount paid for full-day OT</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-heading">New Password (leave blank to keep current)</Label>
                <Input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="modern-input"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-heading">Active Status</Label>
                <Switch
                  checked={editingUser.active !== false}
                  onCheckedChange={(checked) => setEditingUser({ ...editingUser, active: checked })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1 modern-button modern-button-secondary">
                  Cancel
                </Button>
                <Button onClick={handleSaveEditUser} className="flex-1 modern-button modern-button-primary">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent className="modern-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-red-400">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-body">
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="modern-button modern-button-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="modern-button bg-gradient-to-r from-red-500/40 to-pink-500/40 hover:from-red-500/60 hover:to-pink-500/60 border-red-500/40">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
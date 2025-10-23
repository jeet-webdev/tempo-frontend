import React from 'react';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Mail, User as UserIcon, Edit, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface UserProfileDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserProfileDialog({ userId, open, onOpenChange }: UserProfileDialogProps) {
  const { user: currentUser } = useAuth();
  const { users, channels, updateUser } = useData();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedUser, setEditedUser] = React.useState<Partial<User>>({});

  const user = users.find(u => u.id === userId);
  const isOwner = currentUser?.role === 'owner';
  const isOwnProfile = currentUser?.id === userId;

  if (!user) return null;

  const userChannels = channels.filter(c => 
    c.members?.includes(userId) || c.managerId === userId
  );

  const handleEdit = () => {
    setEditedUser({
      otHalfDayRate: user.otHalfDayRate,
      otFullDayRate: user.otFullDayRate,
      baseSalary: user.baseSalary,
      notes: user.notes,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    // Validate OT rates - convert to numbers and check
    const halfDayRate = editedUser.otHalfDayRate !== undefined ? Number(editedUser.otHalfDayRate) : undefined;
    const fullDayRate = editedUser.otFullDayRate !== undefined ? Number(editedUser.otFullDayRate) : undefined;
    const salary = editedUser.baseSalary !== undefined ? Number(editedUser.baseSalary) : undefined;

    if (halfDayRate !== undefined && (isNaN(halfDayRate) || halfDayRate < 0)) {
      toast({
        title: "Invalid input",
        description: "OT half-day rate must be a valid positive number.",
        variant: "destructive",
      });
      return;
    }
    if (fullDayRate !== undefined && (isNaN(fullDayRate) || fullDayRate < 0)) {
      toast({
        title: "Invalid input",
        description: "OT full-day rate must be a valid positive number.",
        variant: "destructive",
      });
      return;
    }
    if (salary !== undefined && (isNaN(salary) || salary < 0)) {
      toast({
        title: "Invalid input",
        description: "Base salary must be a valid positive number.",
        variant: "destructive",
      });
      return;
    }

    // Only update if there are actual changes
    const hasChanges = 
      halfDayRate !== user.otHalfDayRate ||
      fullDayRate !== user.otFullDayRate ||
      salary !== user.baseSalary ||
      (editedUser.notes || '') !== (user.notes || '');

    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    // Build clean updates object
    const cleanUpdates: Partial<User> = {};
    if (halfDayRate !== undefined) cleanUpdates.otHalfDayRate = halfDayRate;
    if (fullDayRate !== undefined) cleanUpdates.otFullDayRate = fullDayRate;
    if (salary !== undefined) cleanUpdates.baseSalary = salary;
    if (editedUser.notes !== undefined) cleanUpdates.notes = editedUser.notes;

    updateUser(userId, cleanUpdates);
    setIsEditing(false);
    toast({
      title: "OT updated successfully",
      description: "Employee OT rates have been saved.",
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedUser({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] modern-modal max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold gradient-text">User Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Info */}
          <Card className="modern-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Basic Information</CardTitle>
                {isOwner && !isEditing && (
                  <Button
                    size="sm"
                    onClick={handleEdit}
                    className="modern-button modern-button-secondary h-9 px-4"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-heading">{user.name}</h3>
                  <Badge className="mt-1 capitalize">{user.role.replace('_', ' ')}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <Label className="text-muted text-sm">Employee Code</Label>
                  <p className="text-heading font-semibold mt-1">{user.employeeCode}</p>
                </div>
                <div>
                  <Label className="text-muted text-sm">Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-body" />
                    <p className="text-heading font-semibold">{user.email}</p>
                  </div>
                </div>
                {user.joinedDate && (
                  <div>
                    <Label className="text-muted text-sm">Joined Date</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-body" />
                      <p className="text-heading font-semibold">
                        {format(user.joinedDate, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Channels */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="text-lg">Channels</CardTitle>
            </CardHeader>
            <CardContent>
              {userChannels.length === 0 ? (
                <p className="text-muted text-sm">Not assigned to any channels</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {userChannels.map(channel => (
                    <Badge key={channel.id} variant="outline" className="px-3 py-1">
                      {channel.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overtime (OT) Rates - Owner can edit, others can view */}
          {(isOwner || isOwnProfile) && (
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="text-lg">Overtime (OT) Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing && isOwner ? (
                  <>
                    <div>
                      <Label htmlFor="otHalfDay">Half-Day Rate (₹)</Label>
                      <Input
                        id="otHalfDay"
                        type="number"
                        step="50"
                        min="0"
                        value={editedUser.otHalfDayRate ?? ''}
                        onChange={(e) => setEditedUser({ ...editedUser, otHalfDayRate: e.target.value ? Number(e.target.value) : undefined })}
                        className="modern-input mt-2"
                        placeholder="Enter half-day OT rate"
                      />
                      <p className="text-xs text-muted mt-1">Amount paid for half-day overtime</p>
                    </div>
                    <div>
                      <Label htmlFor="otFullDay">Full-Day Rate (₹)</Label>
                      <Input
                        id="otFullDay"
                        type="number"
                        step="50"
                        min="0"
                        value={editedUser.otFullDayRate ?? ''}
                        onChange={(e) => setEditedUser({ ...editedUser, otFullDayRate: e.target.value ? Number(e.target.value) : undefined })}
                        className="modern-input mt-2"
                        placeholder="Enter full-day OT rate"
                      />
                      <p className="text-xs text-muted mt-1">Amount paid for full-day overtime</p>
                    </div>
                    <div>
                      <Label htmlFor="baseSalary">Base Salary (₹)</Label>
                      <Input
                        id="baseSalary"
                        type="number"
                        step="1000"
                        min="0"
                        value={editedUser.baseSalary ?? ''}
                        onChange={(e) => setEditedUser({ ...editedUser, baseSalary: e.target.value ? Number(e.target.value) : undefined })}
                        className="modern-input mt-2"
                        placeholder="Enter base salary"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={editedUser.notes || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, notes: e.target.value })}
                        className="modern-input mt-2"
                        rows={3}
                        placeholder="Add any notes about this employee..."
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSave} className="modern-button modern-button-primary flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button onClick={handleCancel} className="modern-button modern-button-secondary flex-1">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted text-sm">OT Half-Day Rate</Label>
                      <p className="text-heading font-semibold mt-1">
                        {user.otHalfDayRate ? `₹${user.otHalfDayRate}` : <span className="text-muted">Not set</span>}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted text-sm">OT Full-Day Rate</Label>
                      <p className="text-heading font-semibold mt-1">
                        {user.otFullDayRate ? `₹${user.otFullDayRate}` : <span className="text-muted">Not set</span>}
                      </p>
                    </div>
                    {user.baseSalary && (
                      <div>
                        <Label className="text-muted text-sm">Base Salary</Label>
                        <p className="text-heading font-semibold mt-1">₹{user.baseSalary}</p>
                      </div>
                    )}
                    {user.notes && (
                      <div className="col-span-2">
                        <Label className="text-muted text-sm">Notes</Label>
                        <p className="text-body mt-1">{user.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
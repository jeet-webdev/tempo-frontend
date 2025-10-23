import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, AlertCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { OTType } from '@/types';
import UserProfileDialog from './UserProfileDialog';

interface LogOTDialogProps {
  channelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LogOTDialog({ channelId, open, onOpenChange }: LogOTDialogProps) {
  const { user: currentUser } = useAuth();
  const { users, channels, addOTEntry } = useData();
  const { toast } = useToast();
  
  const [selectedUserId, setSelectedUserId] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [type, setType] = useState<OTType>('half_day');
  const [notes, setNotes] = useState('');
  const [showUserProfile, setShowUserProfile] = useState(false);

  const channel = channels.find(c => c.id === channelId);
  const channelMembers = users.filter(u => channel?.members?.includes(u.id));
  const selectedUser = users.find(u => u.id === selectedUserId);

  // Auto-calculate amount based on type and user rates
  const amount = type === 'half_day' 
    ? (selectedUser?.otHalfDayRate || 0)
    : (selectedUser?.otFullDayRate || 0);

  const rateNotSet = selectedUser && !amount;
  const canSave = selectedUserId && amount > 0;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedUserId('');
      setDate(new Date());
      setType('half_day');
      setNotes('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!canSave) return;

    addOTEntry({
      userId: selectedUserId,
      channelId,
      date,
      type,
      amount,
      notes,
      loggedBy: currentUser!.id,
    });

    toast({
      title: "OT Logged",
      description: `OT logged for ${selectedUser?.name} — ${type === 'half_day' ? 'Half Day' : 'Full Day'} on ${format(date, 'MMM d, yyyy')} ₹${amount}`,
    });

    onOpenChange(false);
  };

  const handleEditUserRates = () => {
    setShowUserProfile(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] modern-modal">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold gradient-text">Log OT</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="employee">Employee</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="modern-input mt-2">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="modern-modal">
                  {channelMembers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal modern-input mt-2"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 modern-modal">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as OTType)}>
                <SelectTrigger className="modern-input mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="modern-modal">
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="full_day">Full Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount Display or Warning */}
            {selectedUser && (
              <>
                {rateNotSet ? (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <p className="font-semibold mb-2">No OT rate set for this user.</p>
                      <p className="text-sm mb-3">
                        Set it in Settings → People → Edit User → Overtime (OT) Rates.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleEditUserRates}
                        className="modern-button modern-button-secondary h-8 px-3"
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Edit User Rates
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="modern-card p-4">
                    <Label className="text-muted text-sm">Amount</Label>
                    <p className="text-2xl font-bold gradient-text mt-1">
                      ₹{amount}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      Auto-filled from user's {type === 'half_day' ? 'half-day' : 'full-day'} rate
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="modern-input mt-2"
                rows={3}
                placeholder="Add any additional notes..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                className="modern-button modern-button-primary flex-1"
                disabled={!canSave}
              >
                Log OT
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                className="modern-button modern-button-secondary flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Profile Dialog for editing rates */}
      {selectedUserId && (
        <UserProfileDialog
          userId={selectedUserId}
          open={showUserProfile}
          onOpenChange={setShowUserProfile}
        />
      )}
    </>
  );
}
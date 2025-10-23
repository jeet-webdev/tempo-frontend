import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, CalendarIcon, Download, Trash2, Filter, Edit2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

interface OTLogPageProps {
  onBack: () => void;
}

export default function OTLogPage({ onBack }: OTLogPageProps) {
  const { user: currentUser } = useAuth();
  const { otEntries, users, channels, deleteOTEntry, updateOTEntry } = useData();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);

  const isOwner = currentUser?.role === 'owner';
  const isChannelManager = currentUser?.role === 'channel_manager';

  // Filter entries based on user role
  let visibleEntries = otEntries;
  if (isChannelManager && !isOwner) {
    const managedChannelIds = channels
      .filter(c => c.managerId === currentUser?.id)
      .map(c => c.id);
    visibleEntries = otEntries.filter(e => managedChannelIds.includes(e.channelId));
  }

  // Apply filters
  const filteredEntries = visibleEntries.filter(entry => {
    if (dateRange?.from && entry.date < dateRange.from) return false;
    if (dateRange?.to && entry.date > dateRange.to) return false;
    if (selectedEmployee !== 'all' && entry.userId !== selectedEmployee) return false;
    if (selectedChannel !== 'all' && entry.channelId !== selectedChannel) return false;
    if (selectedType !== 'all' && entry.type !== selectedType) return false;
    return true;
  });

  const totalAmount = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);

  const handleExportCSV = () => {
    const headers = ['Date', 'Employee', 'Channel', 'Type', 'Amount', 'Notes', 'Logged By'];
    const rows = filteredEntries.map(entry => {
      const user = users.find(u => u.id === entry.userId);
      const channel = channels.find(c => c.id === entry.channelId);
      const loggedBy = users.find(u => u.id === entry.loggedBy);
      return [
        format(entry.date, 'yyyy-MM-dd'),
        user?.name || '',
        channel?.name || '',
        entry.type === 'half_day' ? 'Half Day' : 'Full Day',
        entry.amount.toString(),
        entry.notes || '',
        loggedBy?.name || '',
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ot-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handleStartEdit = (entryId: string, currentAmount: number) => {
    setEditingId(entryId);
    setEditAmount(currentAmount);
  };

  const handleSaveEdit = () => {
    if (editingId) {
      updateOTEntry(editingId, { amount: editAmount });
      toast({
        title: "Amount updated",
        description: "OT entry amount has been updated successfully.",
      });
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount(0);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteOTEntry(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="modern-card p-6 mb-6 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">OT Log</h1>
              <p className="text-body mt-1">View and manage overtime entries</p>
            </div>
            <Button
              onClick={handleExportCSV}
              className="modern-button modern-button-primary h-10 px-4"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="modern-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-heading">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-semibold text-muted mb-2 block">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal modern-input"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                          </>
                        ) : (
                          format(dateRange.from, 'MMM d, yyyy')
                        )
                      ) : (
                        'Pick a date range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 modern-modal" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted mb-2 block">Employee</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="modern-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="modern-modal">
                    <SelectItem value="all">All Employees</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted mb-2 block">Channel</label>
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger className="modern-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="modern-modal">
                    <SelectItem value="all">All Channels</SelectItem>
                    {channels.map(channel => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted mb-2 block">Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="modern-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="modern-modal">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="full_day">Full Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="modern-card">
          <CardContent className="p-0">
            {filteredEntries.length === 0 ? (
              <div className="py-16 text-center text-muted">
                <p className="text-lg font-semibold mb-2">No OT entries found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/10">
                        <TableHead className="font-bold text-heading">Date</TableHead>
                        <TableHead className="font-bold text-heading">Employee</TableHead>
                        <TableHead className="font-bold text-heading">Channel</TableHead>
                        <TableHead className="font-bold text-heading">Type</TableHead>
                        <TableHead className="font-bold text-heading">Amount</TableHead>
                        <TableHead className="font-bold text-heading">Notes</TableHead>
                        <TableHead className="font-bold text-heading">Logged By</TableHead>
                        {isOwner && <TableHead className="font-bold text-heading">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map(entry => {
                        const user = users.find(u => u.id === entry.userId);
                        const channel = channels.find(c => c.id === entry.channelId);
                        const loggedBy = users.find(u => u.id === entry.loggedBy);
                        const isEditing = editingId === entry.id;
                        const hasNoAmount = !entry.amount || entry.amount === 0;
                        
                        return (
                          <TableRow key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                            <TableCell className="font-semibold text-body">
                              {format(entry.date, 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-body">{user?.name}</TableCell>
                            <TableCell className="text-body">{channel?.name}</TableCell>
                            <TableCell>
                              <span className="modern-badge modern-badge-info">
                                {entry.type === 'half_day' ? 'Half Day' : 'Full Day'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(Number(e.target.value))}
                                    className="modern-input w-24 h-8"
                                    step="50"
                                    min="0"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    className="modern-button modern-button-primary h-8 px-2"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    className="modern-button modern-button-secondary h-8 px-2"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-heading">₹{entry.amount}</span>
                                  {hasNoAmount && (
                                    <span className="modern-badge modern-badge-warning">
                                      Amount not set
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-body">{entry.notes || '-'}</TableCell>
                            <TableCell className="text-body">{loggedBy?.name}</TableCell>
                            {isOwner && (
                              <TableCell>
                                <div className="flex gap-1">
                                  {!isEditing && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleStartEdit(entry.id, entry.amount)}
                                      className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-white/10"
                                      title="Edit Amount"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeleteId(entry.id)}
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-white/10"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="border-t border-white/10 p-6 bg-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-heading font-semibold">
                      Total Entries: {filteredEntries.length}
                    </p>
                    <p className="text-2xl font-bold gradient-text">
                      Total: ₹{totalAmount}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="modern-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-heading">Delete OT Entry</AlertDialogTitle>
            <AlertDialogDescription className="text-body">
              Are you sure you want to delete this OT entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="modern-button modern-button-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="modern-button modern-button-primary bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
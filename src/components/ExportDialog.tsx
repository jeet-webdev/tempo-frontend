import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarIcon, Download } from 'lucide-react';
import { format, startOfToday, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (config: ExportConfig) => void;
}

export interface ExportConfig {
  dateFrom: Date | null;
  dateTo: Date | null;
  fields: string[];
  scope: 'selected' | 'all';
}

const STORAGE_KEY = 'completed_export_range';

const PRESETS = [
  { label: 'Today', getValue: () => ({ from: startOfToday(), to: startOfToday() }) },
  { label: 'Last 7 days', getValue: () => ({ from: subDays(startOfToday(), 6), to: startOfToday() }) },
  { label: 'Last 30 days', getValue: () => ({ from: subDays(startOfToday(), 29), to: startOfToday() }) },
  { label: 'This month', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Last month', getValue: () => {
    const lastMonth = subMonths(new Date(), 1);
    return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
  }},
];

const DEFAULT_FIELDS = [
  'Channel',
  'Title',
  'Completed At',
  'Due Date',
  'Assignees',
  'Column Path',
  'Custom Fields',
  'Final Links',
];

export default function ExportDialog({ open, onOpenChange, onExport }: ExportDialogProps) {
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(DEFAULT_FIELDS));
  const [scope, setScope] = useState<'selected' | 'all'>('all');
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);

  // Load last used range from localStorage
  useEffect(() => {
    if (open) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { from, to } = JSON.parse(saved);
          if (from) setDateFrom(new Date(from));
          if (to) setDateTo(new Date(to));
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }, [open]);

  const handlePreset = (preset: typeof PRESETS[0]) => {
    const { from, to } = preset.getValue();
    setDateFrom(from);
    setDateTo(to);
  };

  const handleFieldToggle = (field: string) => {
    const newFields = new Set(selectedFields);
    if (newFields.has(field)) {
      newFields.delete(field);
    } else {
      newFields.add(field);
    }
    setSelectedFields(newFields);
  };

  const handleExport = () => {
    // Save range to localStorage
    if (dateFrom && dateTo) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      }));
    }

    onExport({
      dateFrom,
      dateTo,
      fields: Array.from(selectedFields),
      scope,
    });
    onOpenChange(false);
  };

  const isValidRange = !dateFrom || !dateTo || dateFrom <= dateTo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modern-modal max-w-2xl max-h-[90vh] overflow-y-auto p-8">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-2xl font-bold gradient-text">
            Export Completed Tasks
          </DialogTitle>
          <DialogDescription className="text-body">
            Configure your export settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Date Range Presets */}
          <div>
            <Label className="text-heading font-medium mb-3 block">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  onClick={() => handlePreset(preset)}
                  className="modern-button modern-button-secondary h-9 px-4 text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div>
            <Label className="text-heading font-medium mb-3 block">Custom Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-body text-xs mb-2 block">From</Label>
                <Popover open={showFromCalendar} onOpenChange={setShowFromCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal modern-input h-10",
                        !dateFrom && "text-muted"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 modern-modal" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom || undefined}
                      onSelect={(date) => {
                        setDateFrom(date || null);
                        setShowFromCalendar(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-body text-xs mb-2 block">To</Label>
                <Popover open={showToCalendar} onOpenChange={setShowToCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal modern-input h-10",
                        !dateTo && "text-muted"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 modern-modal" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo || undefined}
                      onSelect={(date) => {
                        setDateTo(date || null);
                        setShowToCalendar(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {!isValidRange && (
              <p className="text-xs text-red-400 mt-2">From date must be before or equal to To date</p>
            )}
          </div>

          {/* Fields Selection */}
          <div>
            <Label className="text-heading font-medium mb-3 block">Fields to Export</Label>
            <div className="space-y-2 modern-card p-4">
              {DEFAULT_FIELDS.map((field) => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox
                    id={field}
                    checked={selectedFields.has(field)}
                    onCheckedChange={() => handleFieldToggle(field)}
                  />
                  <label
                    htmlFor={field}
                    className="text-sm text-body cursor-pointer"
                  >
                    {field}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Scope Selection */}
          <div>
            <Label className="text-heading font-medium mb-3 block">Export Scope</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="scope-all"
                  name="scope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="w-4 h-4"
                />
                <label htmlFor="scope-all" className="text-sm text-body cursor-pointer">
                  All results in current filters
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="scope-selected"
                  name="scope"
                  checked={scope === 'selected'}
                  onChange={() => setScope('selected')}
                  className="w-4 h-4"
                />
                <label htmlFor="scope-selected" className="text-sm text-body cursor-pointer">
                  Selected rows only
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-white/20 mt-8">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="modern-button modern-button-secondary rounded-full"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!isValidRange || selectedFields.size === 0}
            className="modern-button modern-button-primary rounded-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

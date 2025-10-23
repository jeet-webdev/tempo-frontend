import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomField, CustomFieldType, Channel, UserRole } from '@/types';
import { GripVertical, Trash2, Plus, Settings2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useData } from '@/contexts/DataContext';

interface CustomFieldsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
}

export default function CustomFieldsManager({ open, onOpenChange, channel }: CustomFieldsManagerProps) {
  const { toast } = useToast();
  const { updateChannel, users, roles } = useData();
  const [fields, setFields] = useState<CustomField[]>(channel.customFields || []);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);

  useEffect(() => {
    setFields(channel.customFields || []);
  }, [channel.customFields]);

  const handleAddField = () => {
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      name: 'New Field',
      type: 'text',
      order: fields.length,
      showOnCardFront: false,
      permissions: {
        editableByRoles: [],
        editableByColumnResponsibility: false,
        editableByUsers: [],
      },
    };
    const newFields = [...fields, newField];
    setFields(newFields);
    updateChannel(channel.id, { customFields: newFields });
    
    toast({
      title: "Saved",
      description: "New field created.",
    });
  };

  const handleUpdateField = (id: string, updates: Partial<CustomField>) => {
    const newFields = fields.map(f => f.id === id ? { ...f, ...updates } : f);
    setFields(newFields);
    updateChannel(channel.id, { customFields: newFields });
    
    toast({
      title: "Saved",
      description: "Field updated.",
    });
  };

  const handleDeleteField = (id: string) => {
    setDeleteFieldId(id);
  };

  const confirmDelete = () => {
    if (!deleteFieldId) return;
    
    const newFields = fields.filter(f => f.id !== deleteFieldId);
    setFields(newFields);
    updateChannel(channel.id, { customFields: newFields });
    setDeleteFieldId(null);
    
    toast({
      title: "Saved",
      description: "Field deleted from all cards.",
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...fields];
    const draggedItem = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedItem);

    setFields(newFields.map((f, idx) => ({ ...f, order: idx })));
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    updateChannel(channel.id, { customFields: fields });
    
    toast({
      title: "Saved",
      description: "Field order updated.",
    });
  };

  const fieldToDelete = fields.find(f => f.id === deleteFieldId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] modern-modal max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-heading text-xl">Custom Fields - {channel.name}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {fields.length === 0 ? (
              <div className="text-center py-12 text-white/50">
                <Settings2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-body">No custom fields yet</p>
                <p className="text-sm mt-1 text-white/40">Add fields to customize your cards</p>
              </div>
            ) : (
              fields.map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`glass-card p-4 cursor-move hover:border-purple-500/40 transition-all ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-5 w-5 text-white/50 flex-shrink-0 mt-1" />
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={field.name}
                          onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                          className="flex-1 modern-input h-9"
                          placeholder="Field name"
                        />
                        <Select
                          value={field.type}
                          onValueChange={(value: CustomFieldType) => handleUpdateField(field.id, { type: value })}
                        >
                          <SelectTrigger className="w-32 modern-input h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="modern-modal">
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="link">Link</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="dropdown">Dropdown</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {field.type === 'dropdown' && (
                        <div className="space-y-2">
                          <Label className="text-label text-xs">Dropdown Options</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingField(field)}
                            className="w-full modern-button-secondary h-8"
                          >
                            Manage Options ({field.dropdownOptions?.length || 0})
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.showOnCardFront}
                            onCheckedChange={(checked) => handleUpdateField(field.id, { showOnCardFront: checked })}
                          />
                          <Label className="text-sm text-body">Show on card front</Label>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingField(field)}
                          className="modern-button-secondary h-8"
                        >
                          <Settings2 className="h-3 w-3 mr-1" />
                          Permissions
                        </Button>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteField(field.id)}
                      className="flex-shrink-0 icon-button hover:bg-red-500/20 hover:border-red-500/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={handleAddField}
              className="flex-1 modern-button-secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
            <Button onClick={() => onOpenChange(false)} className="flex-1 modern-button-primary">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Field Settings Dialog */}
      {editingField && (
        <FieldSettingsDialog
          field={editingField}
          channel={channel}
          onClose={() => setEditingField(null)}
          onSave={(updates) => {
            handleUpdateField(editingField.id, updates);
            setEditingField(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFieldId} onOpenChange={(open) => !open && setDeleteFieldId(null)}>
        <AlertDialogContent className="modern-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-heading">Delete Field</AlertDialogTitle>
            <AlertDialogDescription className="text-body">
              Are you sure you want to delete "{fieldToDelete?.name}"? This will remove the field and its data from all cards in this board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="modern-button-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="modern-button-primary bg-gradient-to-r from-red-500/35 to-red-600/35 hover:from-red-500/50 hover:to-red-600/50 border-red-500/40">
              Delete Field
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Field Settings Dialog Component
interface FieldSettingsDialogProps {
  field: CustomField;
  channel: Channel;
  onClose: () => void;
  onSave: (updates: Partial<CustomField>) => void;
}

function FieldSettingsDialog({ field, channel, onClose, onSave }: FieldSettingsDialogProps) {
  const { users, roles } = useData();
  const [dropdownOptions, setDropdownOptions] = useState<string[]>(field.dropdownOptions || []);
  const [newOption, setNewOption] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(field.permissions?.editableByRoles || []);
  const [columnResponsibility, setColumnResponsibility] = useState(field.permissions?.editableByColumnResponsibility || false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(field.permissions?.editableByUsers || []);
  const [requiredColumns, setRequiredColumns] = useState<string[]>(field.requiredInColumns || []);

  const handleSave = () => {
    onSave({
      dropdownOptions: field.type === 'dropdown' ? dropdownOptions : undefined,
      permissions: {
        editableByRoles: selectedRoles,
        editableByColumnResponsibility: columnResponsibility,
        editableByUsers: selectedUsers,
      },
      requiredInColumns: requiredColumns,
    });
  };

  const allRoles: string[] = ['owner', 'channel_manager', 'script_writer', 'audio_editor', 'video_editor'];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] modern-modal max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-heading text-xl">Field Settings - {field.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="permissions" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            {field.type === 'dropdown' && <TabsTrigger value="options">Options</TabsTrigger>}
            <TabsTrigger value="required">Required</TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="flex-1 overflow-y-auto space-y-4 mt-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm text-heading">Editable by Roles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {allRoles.map(role => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles([...selectedRoles, role]);
                        } else {
                          setSelectedRoles(selectedRoles.filter(r => r !== role));
                        }
                      }}
                    />
                    <Label className="text-sm text-body capitalize">{role.replace('_', ' ')}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={columnResponsibility}
                    onCheckedChange={setColumnResponsibility}
                  />
                  <Label className="text-sm text-body">Editable by column responsibility</Label>
                </div>
                <p className="text-xs text-white/50 mt-2">
                  Users assigned to the current column can edit this field
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm text-heading">Editable by Specific Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(channel.members || []).map(userId => {
                  const user = users.find(u => u.id === userId);
                  if (!user) return null;
                  return (
                    <div key={userId} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedUsers.includes(userId)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers([...selectedUsers, userId]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== userId));
                          }
                        }}
                      />
                      <Label className="text-sm text-body">{user.name}</Label>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {field.type === 'dropdown' && (
            <TabsContent value="options" className="flex-1 overflow-y-auto space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-label">Add Option</Label>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Option name"
                    className="modern-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newOption.trim()) {
                          setDropdownOptions([...dropdownOptions, newOption.trim()]);
                          setNewOption('');
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (newOption.trim()) {
                        setDropdownOptions([...dropdownOptions, newOption.trim()]);
                        setNewOption('');
                      }
                    }}
                    className="modern-button-primary"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {dropdownOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 glass-card">
                    <span className="flex-1 text-sm text-body">{option}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDropdownOptions(dropdownOptions.filter((_, i) => i !== index))}
                      className="h-6 w-6 icon-button"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="required" className="flex-1 overflow-y-auto space-y-4 mt-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm text-heading">Required Before Leaving Column</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {channel.columns.map(column => (
                  <div key={column.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={requiredColumns.includes(column.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setRequiredColumns([...requiredColumns, column.id]);
                        } else {
                          setRequiredColumns(requiredColumns.filter(id => id !== column.id));
                        }
                      }}
                    />
                    <Label className="text-sm text-body">{column.name}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4 border-t border-white/10">
          <Button variant="outline" onClick={onClose} className="flex-1 modern-button-secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1 modern-button-primary">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
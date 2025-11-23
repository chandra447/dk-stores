import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock,Dices  } from 'lucide-react';
import { CreateEmployeeFormData, EditEmployeeFormData, Employee } from '../types/employee';

interface EmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  description: string;
  formData: CreateEmployeeFormData | EditEmployeeFormData;
  onInputChange: (field: keyof (CreateEmployeeFormData | EditEmployeeFormData), value: string | boolean) => void;
  loading: boolean;
  error: string;
  submitText: string;
}

export function EmployeeDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  formData,
  onInputChange,
  loading,
  error,
  submitText
}: EmployeeDialogProps) {
  const calculateBreakTime = (hours: string, minutes: string): number => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    return (h * 60) + m;
  };

  const generateRandomPin = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleGeneratePin = () => {
    onInputChange('pin', generateRandomPin());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Full Name</FieldLabel>
            <Input
              id="name"
              placeholder="Enter employee name"
              value={formData.name}
              onChange={(e) => onInputChange('name', e.target.value)}
              className="h-12"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="startTime" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Start Time
              </FieldLabel>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => onInputChange('startTime', e.target.value)}
                className="h-12"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="endTime" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                End Time
              </FieldLabel>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => onInputChange('endTime', e.target.value)}
                className="h-12"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field>
              <FieldLabel htmlFor="breakHours">Break (Hours)</FieldLabel>
              <Select
                value={formData.breakHours}
                onValueChange={(value) => onInputChange('breakHours', value)}
              >
                <SelectTrigger className="h-12 min-h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 hours</SelectItem>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="3">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="breakMinutes">Break (Minutes)</FieldLabel>
              <Select
                value={formData.breakMinutes}
                onValueChange={(value) => onInputChange('breakMinutes', value)}
              >
                <SelectTrigger className="h-12 min-h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 min</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="ratePerDay">Rate/Day (₹)</FieldLabel>
              <Input
                id="ratePerDay"
                type="number"
                placeholder="500"
                value={formData.ratePerDay}
                onChange={(e) => onInputChange('ratePerDay', e.target.value)}
                className="h-12"
                min="0"
                step="10"
              />
            </Field>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isManager"
              checked={formData.isManager}
              onCheckedChange={(checked) => onInputChange('isManager', !!checked)}
            />
            <FieldLabel htmlFor="isManager" className="font-normal">This employee is a manager</FieldLabel>
          </div>

          {formData.isManager && (
            <Field>
              <FieldLabel htmlFor="pin">
                Manager PIN (4 digits{'isEdit' in formData ? ', leave empty to keep current' : ''})
              </FieldLabel>
              <div className="relative">
                <Input
                  id="pin"
                  type="text"
                  placeholder="1234"
                  value={formData.pin}
                  onChange={(e) => {
                    // Only allow digits and max 4 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    onInputChange('pin', value);
                  }}
                  className="h-12 pr-12"
                  maxLength={4}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGeneratePin}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                  title="Generate random PIN"
                >
                  <Dices className="h-4 w-4" />
                </Button>
              </div>
        
        
            </Field>
          )}

          {error && (
            <FieldDescription className="text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md">
              {error}
            </FieldDescription>
          )}
        </FieldGroup>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? 'Processing...' : submitText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
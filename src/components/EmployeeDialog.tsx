import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Dices } from 'lucide-react';
import { CreateEmployeeFormData, EditEmployeeFormData } from '../types/employee';

interface EmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
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
  formData,
  onInputChange,
  loading,
  error,
  submitText
}: EmployeeDialogProps) {
  
  const generateRandomPin = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleGeneratePin = () => {
    onInputChange('pin', generateRandomPin());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 1. max-h-[85vh]: Ensures modal never exceeds 85% of screen height (crucial for mobile) 
        2. flex flex-col: Allows us to split header, body, and footer
        3. p-0: Remove default padding so scrollbar hits the edge
        4. gap-0: We manage spacing via padding in children
      */}
      <DialogContent className="sm:max-w-lg max-h-[85vh] w-[95vw] flex flex-col p-0 gap-0">
        
        {/* Sticky Header */}
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Scrollable Form Body 
            flex-1 allows it to take remaining height
            overflow-y-auto enables scrolling ONLY on this section
        */}
        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <FieldGroup className="space-y-4">
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
                  Start
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
                  End
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

            {/* Mobile Logic: grid-cols-2 
              - Break Hour (col-span-1)
              - Break Min (col-span-1)
              - Rate (col-span-2) -> Pushes Rate to full width new line on mobile
              
              Desktop Logic: sm:grid-cols-3
              - All items take 1 column
            */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field className="col-span-1">
                <FieldLabel htmlFor="breakHours">Break (Hrs)</FieldLabel>
                <Select
                  value={formData.breakHours}
                  onValueChange={(value) => onInputChange('breakHours', value)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 hr</SelectItem>
                    <SelectItem value="1">1 hr</SelectItem>
                    <SelectItem value="2">2 hrs</SelectItem>
                    <SelectItem value="3">3 hrs</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="col-span-1">
                <FieldLabel htmlFor="breakMinutes">Break (Min)</FieldLabel>
                <Select
                  value={formData.breakMinutes}
                  onValueChange={(value) => onInputChange('breakMinutes', value)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 m</SelectItem>
                    <SelectItem value="15">15 m</SelectItem>
                    <SelectItem value="30">30 m</SelectItem>
                    <SelectItem value="45">45 m</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="col-span-2 sm:col-span-1">
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

            <div className="flex items-center space-x-2 py-2">
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
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      onInputChange('pin', value);
                    }}
                    className="h-12 pr-12"
                    maxLength={4}
                    inputMode="numeric" // Helps mobile keyboards show numbers
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
        </div>

        {/* Sticky Footer */}
        <DialogFooter className="p-6 pt-2 bg-background z-10">
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
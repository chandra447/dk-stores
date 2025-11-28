import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TimeInput } from '@/components/ui/time-input';
import { toast } from 'sonner';
import { Clock, Edit2 } from 'lucide-react';
import { Employee } from '@/types/employee';

interface EditPresentTimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  registerStartTime: number; // Start time of register for validation
  updatePresentTime: (args: any) => Promise<any>;
  onSuccess?: () => void;
}

export function EditPresentTimeDialog({
  isOpen,
  onClose,
  employee,
  registerStartTime,
  updatePresentTime,
  onSuccess,
}: EditPresentTimeDialogProps) {
  const [presentTime, setPresentTime] = useState<number | undefined>(employee.presentTime || undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      // Convert the presentTime timestamp to today's date with the same time
      let timeForToday: number | undefined = undefined;
      if (employee.presentTime) {
        const originalTime = new Date(employee.presentTime);
        const today = new Date();
        today.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
        timeForToday = today.getTime();
      }
      setPresentTime(timeForToday);
      setError('');
    } else {
      setIsSubmitting(false);
      setError('');
    }
  }, [isOpen, employee.presentTime]);

  // Handle time change from TimeInput
  const handleTimeChange = (_timeString: string, timestamp?: number) => {
    setPresentTime(timestamp);
    setError('');
  };

  // Validate the form
  const validateForm = (): boolean => {
    if (!presentTime) {
      setError('Please select a present time');
      return false;
    }

    // Check if time is in the future
    if (presentTime > Date.now()) {
      setError('Cannot set present time in the future');
      return false;
    }

    // Check if time is before register start time
    if (presentTime < registerStartTime) {
      setError('Present time cannot be before register start time');
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Call the mutation
      await updatePresentTime({
        rollcallId: employee.rollcallId! as any,
        newPresentTime: presentTime!,
      });

      // Show success message
      toast.success('Present time updated successfully', {
        description: `${employee.name} is now marked present at ${new Date(presentTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`,
      });

      // Close dialog and call success callback
      onClose();
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to update present time:', err);
      setError(err.message || 'Failed to update present time');

      toast.error('Failed to update present time', {
        description: err.message || 'An error occurred while updating the present time.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            Edit Present Time for {employee.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Time Input */}
          <div>
            <TimeInput
              value={presentTime as any}
              onChange={handleTimeChange}
              label="Present Time"
              id="presentTime"
              required
              error={error}
            />
          </div>

      

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !presentTime}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  Update Time
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
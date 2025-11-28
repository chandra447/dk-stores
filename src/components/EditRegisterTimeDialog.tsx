import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TimeInput } from '@/components/ui/time-input';
import { toast } from 'sonner';
import { Clock, Edit2 } from 'lucide-react';

interface EditRegisterTimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  registerId: string;
  currentStartTime: number;
  selectedStartOfDay: number;
  selectedEndOfDay: number;
  updateRegisterStartTime: (args: any) => Promise<any>;
  onSuccess?: () => void;
}

export function EditRegisterTimeDialog({
  isOpen,
  onClose,
  registerId,
  currentStartTime,
  selectedStartOfDay,
  selectedEndOfDay,
  updateRegisterStartTime,
  onSuccess,
}: EditRegisterTimeDialogProps) {
  const [startTime, setStartTime] = useState<number | undefined>(currentStartTime);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setStartTime(currentStartTime);
      setError('');
    } else {
      setIsSubmitting(false);
      setError('');
    }
  }, [isOpen, currentStartTime]);

  // Handle time change from TimeInput
  const handleTimeChange = (timeString: string, timestamp?: number) => {
    setStartTime(timestamp);
    setError('');
  };

  // Validate the form
  const validateForm = (): boolean => {
    if (!startTime) {
      setError('Please select a start time');
      return false;
    }

    // Check if time is in the future
    if (startTime > Date.now()) {
      setError('Cannot set start time in the future');
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
      await updateRegisterStartTime({
        registerId: registerId as any,
        newStartTime: startTime!,
        clientLocalStartOfDay: selectedStartOfDay,
        clientLocalEndOfDay: selectedEndOfDay,
      });

      // Show success message
      toast.success('Register start time updated successfully', {
        description: `Opening time is now ${new Date(startTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`,
      });

      // Close dialog and call success callback
      onClose();
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to update register start time:', err);
      setError(err.message || 'Failed to update register start time');

      toast.error('Failed to update start time', {
        description: err.message || 'An error occurred while updating the register start time.',
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
            Edit Register Start Time
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Time Input */}
          <div>
            <TimeInput
              value={startTime}
              onChange={handleTimeChange}
              label="Register Start Time"
              id="startTime"
              required
              error={error}
            />
          </div>

          {/* Additional Information */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Note:</p>
                <ul className="space-y-1 text-xs">
                  <li>• You can only edit today's register start time</li>
                  <li>• Time cannot be set in the future</li>
                  <li>• This will update the opening time for today's register</li>
                </ul>
              </div>
            </div>
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
              disabled={isSubmitting || !startTime}
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

// Export a button component that can be used to trigger the dialog
interface EditRegisterTimeButtonProps {
  registerId: string;
  currentStartTime: number;
  selectedStartOfDay: number;
  selectedEndOfDay: number;
  updateRegisterStartTime: (args: any) => Promise<any>;
  onSuccess?: () => void;
}

export function EditRegisterTimeButton({
  registerId,
  currentStartTime,
  selectedStartOfDay,
  selectedEndOfDay,
  updateRegisterStartTime,
  onSuccess,
}: EditRegisterTimeButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => setIsDialogOpen(true)}
        title="Edit register start time"
      >
        <Edit2 className="w-4 h-4" />
      </Button>

      <EditRegisterTimeDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        registerId={registerId}
        currentStartTime={currentStartTime}
        selectedStartOfDay={selectedStartOfDay}
        selectedEndOfDay={selectedEndOfDay}
        updateRegisterStartTime={updateRegisterStartTime}
        onSuccess={() => {
          setIsDialogOpen(false);
          onSuccess?.();
        }}
      />
    </>
  );
}
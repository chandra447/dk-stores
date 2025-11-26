import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Label } from './label';

interface TimeInputProps {
  value?: string;
  onChange?: (timeString: string, timestamp?: number) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  id?: string;
  required?: boolean;
}

export function TimeInput({
  value,
  onChange,
  placeholder = "HH:MM AM/PM",
  disabled = false,
  error,
  label,
  id,
  required = false,
}: TimeInputProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert Unix timestamp to time string for display
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Parse time string and return Unix timestamp for today's date
  const parseTimeString = (timeString: string): number | null => {
    if (!timeString.trim()) return null;

    // Support multiple formats: "2:30 PM", "14:30", "2:30pm", etc.
    const cleanTime = timeString.trim().toLowerCase();

    // Try 12-hour format with AM/PM
    const twelveHourMatch = cleanTime.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/);
    if (twelveHourMatch) {
      let [, hours, minutes = '00', period] = twelveHourMatch;
      const hour = parseInt(hours);
      const minute = parseInt(minutes);

      if (hour > 12 || hour < 1 || minute > 59) return null;

      const hour24 = period === 'pm' && hour !== 12 ? hour + 12 : period === 'am' && hour === 12 ? 0 : hour;

      const today = new Date();
      today.setHours(hour24, minute, 0, 0);
      return today.getTime();
    }

    // Try 24-hour format
    const twentyFourHourMatch = cleanTime.match(/^(\d{1,2}):?(\d{2})?$/);
    if (twentyFourHourMatch) {
      let [, hours, minutes = '00'] = twentyFourHourMatch;
      const hour = parseInt(hours);
      const minute = parseInt(minutes);

      if (hour > 23 || hour < 0 || minute > 59) return null;

      const today = new Date();
      today.setHours(hour, minute, 0, 0);
      return today.getTime();
    }

    return null;
  };

  // Validate time string and return error message if invalid
  const validateTime = (timeString: string): string | null => {
    if (!timeString.trim()) return required ? 'Time is required' : null;

    const timestamp = parseTimeString(timeString);
    if (timestamp === null) {
      return 'Invalid time format. Use HH:MM AM/PM or HH:MM';
    }

    const now = Date.now();
    if (timestamp > now) {
      return 'Time cannot be in the future';
    }

    return null;
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    const validationError = validateTime(newValue);
    setIsValid(!validationError);

    const timestamp = parseTimeString(newValue);
    onChange?.(newValue, timestamp || undefined);
  };

  // Handle blur for final validation
  const handleBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const timestamp = parseTimeString(newValue);

    if (timestamp) {
      // Format the time for display
      const formatted = formatTimestamp(timestamp);
      setInputValue(formatted);
      onChange?.(formatted, timestamp);
    }
  };

  // Update input value when prop value changes
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value, inputValue]);

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`font-mono ${!isValid || error ? 'border-red-500 focus:border-red-500' : ''}`}
      />
      {(!isValid || error) && (
        <p className="text-sm text-red-500">
          {error || 'Invalid time format. Use HH:MM AM/PM or 24-hour format'}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Format: "2:30 PM" or "14:30"
      </p>
    </div>
  );
}

// Utility function to convert Unix timestamp to formatted time string
export const formatTimeForInput = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// Utility function to validate two time inputs (checkin before checkout)
export const validateTimePair = (
  checkinTimestamp: number | undefined,
  checkoutTimestamp: number | undefined
): string | null => {
  if (!checkinTimestamp || !checkoutTimestamp) return null;

  if (checkinTimestamp >= checkoutTimestamp) {
    return 'Check-in time must be before check-out time';
  }

  return null;
};
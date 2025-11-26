import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

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

interface TimeParts {
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
}

export function TimeInput({
  value,
  onChange,
  disabled = false,
  error,
  label,
  id,
  required = false,
}: TimeInputProps) {
  const [timeParts, setTimeParts] = useState<TimeParts>({ hour: '', minute: '', period: 'AM' });

  // Convert Unix timestamp to time parts for display
  const timestampToTimeParts = (timestamp: number): TimeParts => {
    const date = new Date(timestamp);
    const hours24 = date.getHours();
    const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
    const period = hours24 >= 12 ? 'PM' : 'AM';

    return {
      hour: hours12.toString().padStart(2, '0'),
      minute: date.getMinutes().toString().padStart(2, '0'),
      period: period as 'AM' | 'PM'
    };
  };

  // Convert time parts to Unix timestamp for today's date
  const timePartsToTimestamp = (parts: TimeParts): number | null => {
    const hour = parseInt(parts.hour);
    const minute = parseInt(parts.minute);

    if (isNaN(hour) || isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      return null;
    }

    // Convert 12-hour to 24-hour format
    let hour24 = hour;
    if (parts.period === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    } else if (parts.period === 'AM' && hour === 12) {
      hour24 = 0;
    }

    const today = new Date();
    today.setHours(hour24, minute, 0, 0);
    return today.getTime();
  };

  // Generate hour options (1-12)
  const generateHourOptions = () => {
    const options = [];
    for (let i = 1; i <= 12; i++) {
      options.push(i.toString().padStart(2, '0'));
    }
    return options;
  };

  // Generate minute options (0-59)
  const generateMinuteOptions = () => {
    const options = [];
    for (let i = 0; i < 60; i++) {
      options.push(i.toString().padStart(2, '0'));
    }
    return options;
  };

  // Handle time parts change
  const handleTimePartsChange = (field: keyof TimeParts, value: string) => {
    const newParts = { ...timeParts, [field]: value };
    setTimeParts(newParts);

    const timestamp = timePartsToTimestamp(newParts);
    const displayTime = timestamp ? formatTimestamp(timestamp) : '';
    onChange?.(displayTime, timestamp || undefined);
  };

  // Format timestamp to display string
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Validate time and return error message if invalid
  const validateTimeParts = (parts: TimeParts): string | null => {
    if (!parts.hour || !parts.minute) {
      return required ? 'Time is required' : null;
    }

    const hour = parseInt(parts.hour);
    const minute = parseInt(parts.minute);

    if (isNaN(hour) || isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      return 'Invalid time';
    }

    const timestamp = timePartsToTimestamp(parts);
    if (!timestamp) return 'Invalid time';

    const now = Date.now();
    if (timestamp > now) {
      return 'Time cannot be in the future';
    }

    return null;
  };

  // Update time parts when value prop changes
  useEffect(() => {
    if (value) {
      // Convert to timestamp if it's a number or parse if it's a string
      let timestamp: number;
      if (typeof value === 'number') {
        timestamp = value;
      } else {
        // Try to parse as a date string, fallback to current time if invalid
        const parsed = Date.parse(value);
        timestamp = isNaN(parsed) ? Date.now() : parsed;
      }

      if (!isNaN(timestamp) && timestamp > 0) {
        const parts = timestampToTimeParts(timestamp);
        setTimeParts(parts);
      }
    } else {
      setTimeParts({ hour: '', minute: '', period: 'AM' });
    }
  }, [value]);

  const validationError = validateTimeParts(timeParts);
  const hasError = error || validationError;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="flex items-center gap-1">
        {/* Hour Input */}
        <Select
          value={timeParts.hour}
          onValueChange={(value) => handleTimePartsChange('hour', value)}
          disabled={disabled}
        >
          <SelectTrigger className={`w-[70px] ${hasError ? 'border-red-500 focus:border-red-500' : ''}`}>
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent>
            {generateHourOptions().map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm font-medium">:</span>

        {/* Minute Input */}
        <Select
          value={timeParts.minute}
          onValueChange={(value) => handleTimePartsChange('minute', value)}
          disabled={disabled}
        >
          <SelectTrigger className={`w-[70px] ${hasError ? 'border-red-500 focus:border-red-500' : ''}`}>
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent>
            {generateMinuteOptions().map((minute) => (
              <SelectItem key={minute} value={minute}>
                {minute}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* AM/PM Select */}
        <Select
          value={timeParts.period}
          onValueChange={(value) => handleTimePartsChange('period', value as 'AM' | 'PM')}
          disabled={disabled}
        >
          <SelectTrigger className={`w-[70px] ${hasError ? 'border-red-500 focus:border-red-500' : ''}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasError && (
        <p className="text-sm text-red-500">
          {error || validationError}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Select hour, minute, and AM/PM
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
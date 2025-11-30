/**
 * Timezone utility functions for handling organization timezones
 */

/**
 * Convert a timestamp to the organization's timezone
 */
export function convertToOrganizationTimezone(
    timestamp: Date | string,
    timezone: string = 'America/New_York'
): Date {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    // Use Intl.DateTimeFormat to convert to the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

    return new Date(year, month, day, hour, minute, second);
}

/**
 * Check if a time is within quiet hours
 * Handles cross-day quiet hours (e.g., 22:00 to 06:00)
 */
export function isWithinQuietHours(
    time: Date | string,
    startTime: string | null, // Format: "HH:MM:SS" or "HH:MM"
    endTime: string | null,
    timezone: string = 'America/New_York'
): boolean {
    if (!startTime || !endTime) {
        return false; // No quiet hours configured
    }

    const checkTime = typeof time === 'string' ? new Date(time) : time;
    const localTime = convertToOrganizationTimezone(checkTime, timezone);

    // Parse time strings (handle both "HH:MM:SS" and "HH:MM" formats)
    const parseTime = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes; // Convert to minutes since midnight
    };

    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    const currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();

    // Handle cross-day quiet hours (e.g., 22:00 to 06:00)
    if (endMinutes < startMinutes) {
        // Quiet hours span midnight
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
        // Normal same-day quiet hours
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
}

/**
 * Get the next scheduled time for a daily summary or digest
 */
export function getNextScheduledTime(
    schedule: string, // Format: "HH:MM:SS" or "HH:MM"
    timezone: string = 'America/New_York',
    daysOfWeek?: number[] // 0=Sunday, 1=Monday, etc.
): Date {
    const now = new Date();
    const localNow = convertToOrganizationTimezone(now, timezone);

    // Parse schedule time
    const [hours, minutes] = schedule.split(':').map(Number);
    const scheduleMinutes = hours * 60 + minutes;
    const currentMinutes = localNow.getHours() * 60 + localNow.getMinutes();

    // Create next scheduled date
    let nextScheduled = new Date(localNow);
    nextScheduled.setHours(hours, minutes, 0, 0);

    // If schedule time has passed today, move to next day
    if (currentMinutes >= scheduleMinutes) {
        nextScheduled.setDate(nextScheduled.getDate() + 1);
    }

    // If days of week are specified, find next valid day
    if (daysOfWeek && daysOfWeek.length > 0) {
        while (!daysOfWeek.includes(nextScheduled.getDay())) {
            nextScheduled.setDate(nextScheduled.getDate() + 1);
        }
    }

    return nextScheduled;
}

/**
 * Format time in organization timezone
 */
export function formatTimeInTimezone(
    timestamp: Date | string,
    timezone: string = 'America/New_York',
    format: 'short' | 'long' = 'short'
): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    if (format === 'short') {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date);
    } else {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date);
    }
}


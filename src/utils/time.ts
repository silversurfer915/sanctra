import {buildPeriodAnalytics} from './analytics.ts';
import type { StudySession } from '../types/index.ts';

/**
 * Format total seconds into HH:MM:SS format
 */
export function formatSecondsToHMS(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format seconds into a friendly human-readable format like "2h 15m" or "45m" or "0h 0m"
 */
export function formatDurationHuman(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours === 0 && minutes === 0) {
    return '0h 0m';
  }
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Returns current date in local YYYY-MM-DD format
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if date string is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getLocalDateString();
}

/**
 * Calculate streak and statistics based on the 1-hour/day threshold rule
 * Reference PDF (page 8, 44): "Study a minimum of 1 hour per day to maintain your streak. Missing a day resets your streak back to 0."
 */
export function calculateStreak(sessions: StudySession[], thresholdSeconds: number = 3600): {
  currentStreak: number;
  bestStreak: number;
  activeDays: number;
  qualifyingDays: string[];
} {
  // Aggregate daily seconds
  const dailySeconds: Record<string, number> = {};
  for (const session of sessions) {
    dailySeconds[session.date] = (dailySeconds[session.date] || 0) + session.durationSeconds;
  }

  // Set of dates that met the threshold
  const qualifyingDates = Object.keys(dailySeconds)
    .filter(d => dailySeconds[d] >= thresholdSeconds)
    .sort();

  const qualifyingSet = new Set(qualifyingDates);
  const activeDays = Object.keys(dailySeconds).filter(d => dailySeconds[d] > 0).length;

  // Calculate current streak
  let currentStreak = 0;
  const todayStr = getLocalDateString();
  const today = new Date();
  
  // Check if today qualifies
  const todayQualifies = qualifyingSet.has(todayStr);

  // If today qualifies, start streak count at 1 and count backwards
  // If today does NOT yet qualify, user might still be studying today! Check yesterday.
  let checkDate = new Date(today);
  if (!todayQualifies) {
    // Step back 1 day to yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dStr = getLocalDateString(checkDate);
    if (qualifyingSet.has(dStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate all-time best streak
  let bestStreak = 0;
  let tempStreak = 0;
  if (qualifyingDates.length > 0) {
    tempStreak = 1;
    bestStreak = 1;
    for (let i = 1; i < qualifyingDates.length; i++) {
      const prev = new Date(qualifyingDates[i - 1]);
      const curr = new Date(qualifyingDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
  }

  bestStreak = Math.max(bestStreak, currentStreak);

  return {
    currentStreak,
    bestStreak,
    activeDays,
    qualifyingDays: qualifyingDates,
  };
}

/**
 * Get total seconds studied today
 */
export function getTodaySeconds(sessions: StudySession[], now = new Date()): number {
  return buildPeriodAnalytics(sessions, [], now, 'day', now).totalSeconds;
}

/**
 * Get total seconds studied in current calendar week (Monday to Sunday)
 */
export function getThisWeekSeconds(sessions: StudySession[], now = new Date()): number {
  return buildPeriodAnalytics(sessions, [], now, 'week', now).totalSeconds;
}

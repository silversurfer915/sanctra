export const FREE_GROUP_CREATION_LIMIT = 3;
export const PLUS_GROUP_CREATION_LIMIT = 15;
export const MAX_JOINED_ROOMS_LIMIT = 100;
export const MAX_MESSAGE_LENGTH = 200;

interface MessageRecord {
  timestamp: number;
  text: string;
}

const recentUserMessages: Record<string, MessageRecord[]> = {};

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

/**
 * Enforces chat burst-rate and anti-spam controls per user.
 * Limits to 6 messages per 10 seconds and prevents immediate duplicate message spam.
 */
export function validateMessageRate(uid: string, text: string, nowMs = Date.now()): RateLimitResult {
  const history = (recentUserMessages[uid] || []).filter(m => nowMs - m.timestamp < 10000);
  recentUserMessages[uid] = history;

  if (history.length >= 6) {
    const oldest = history[0];
    const waitSec = Math.max(1, Math.ceil((10000 - (nowMs - oldest.timestamp)) / 1000));
    return {
      allowed: false,
      reason: `Sending messages too quickly. Please pause for ${waitSec}s.`,
      retryAfterSeconds: waitSec,
    };
  }

  // Check duplicate message spam within last 5 seconds
  const trimmed = text.trim().toLowerCase();
  const isDuplicate = history.some(
    m => nowMs - m.timestamp < 5000 && m.text.trim().toLowerCase() === trimmed
  );
  if (isDuplicate) {
    return {
      allowed: false,
      reason: 'Duplicate message detected. Please wait a moment before sending again.',
      retryAfterSeconds: 3,
    };
  }

  history.push({ timestamp: nowMs, text });
  return { allowed: true };
}

/**
 * Validates group creation quota based on active plan (Free vs Plus).
 */
export function canCreateGroup(
  createdCount: number,
  isPlus: boolean
): { allowed: boolean; limit: number; error?: string } {
  const limit = isPlus ? PLUS_GROUP_CREATION_LIMIT : FREE_GROUP_CREATION_LIMIT;
  if (createdCount >= limit) {
    return {
      allowed: false,
      limit,
      error: isPlus
        ? `You have reached the Sanctra Plus+ group limit of ${limit} groups.`
        : `Free accounts can create up to ${limit} study groups. Upgrade to Sanctra Plus+ or archive an older group to create more.`,
    };
  }
  return { allowed: true, limit };
}

/**
 * Resets memory store (useful for test isolation).
 */
export function resetMessageRateStore(): void {
  for (const k of Object.keys(recentUserMessages)) {
    delete recentUserMessages[k];
  }
}

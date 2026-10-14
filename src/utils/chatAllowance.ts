export const FREE_DAILY_MESSAGES = 250;
export const PLUS_DAILY_MESSAGES = 500;
export const DAY_MS = 86_400_000;
export const chatDay = (now = Date.now()) => Math.floor(now / DAY_MS);
export function nextChatUsage(count: number, plus: boolean): number {
  const limit = plus ? PLUS_DAILY_MESSAGES : FREE_DAILY_MESSAGES;
  if (!Number.isInteger(count) || count < 0) throw new Error('Message usage could not be verified.');
  if (count >= limit) throw new Error(`Your ${limit}-message daily allowance is used. It resets at midnight UTC.`);
  return count + 1;
}

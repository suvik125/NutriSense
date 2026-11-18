export const DEFAULT_HYDRATION_GOAL = 8;
export const DEFAULT_HYDRATION_INTERVAL_HOURS = 2;

export function parseTimeToMinutes(hhmm) {
  if (typeof hhmm !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function isWithinQuietHours(prefs, now = new Date()) {
  if (!prefs?.quietHoursEnabled) return false;
  const startMins = parseTimeToMinutes(prefs.quietStart || '22:00');
  const endMins = parseTimeToMinutes(prefs.quietEnd || '07:00');
  if (startMins === null || endMins === null || startMins === endMins) return false;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  if (startMins < endMins) {
    return currentMins >= startMins && currentMins < endMins;
  }
  // Overnight quiet window (e.g. 22:00 -> 07:00)
  return currentMins >= startMins || currentMins < endMins;
}

export function shouldSendBrowserPush(prefs, category = 'System', now = new Date()) {
  if (!prefs?.browserPushEnabled) return false;
  if (isWithinQuietHours(prefs, now)) return false;

  if (category === 'Meal Reminder' && prefs.mealReminders === false) return false;
  if (category === 'Hydration' && prefs.hydrationAlerts === false) return false;
  if (category === 'Wellness' && prefs.illnessCheckins === false) return false;

  return true;
}

export function isHydrationReminderDue(hydration, prefs, nowMs = Date.now(), nowDate = new Date(nowMs)) {
  if (!prefs?.hydrationAlerts || !prefs?.hydrationIntervalEnabled) return false;
  if (isWithinQuietHours(prefs, nowDate)) return false;

  const intervalHours = Number(prefs.hydrationReminderIntervalHours) || DEFAULT_HYDRATION_INTERVAL_HOURS;
  if (intervalHours <= 0) return false;

  const lastAt = Number(hydration?.lastReminderAt) || 0;
  if (!lastAt) return false;

  return nowMs - lastAt >= intervalHours * 60 * 60 * 1000;
}

export function clampWaterGlasses(glasses, maxGlasses = 16) {
  const numeric = Math.round(Number(glasses) || 0);
  return Math.max(0, Math.min(maxGlasses, numeric));
}

export function formatHHMM(date = new Date()) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

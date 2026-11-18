import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampWaterGlasses,
  formatHHMM,
  isHydrationReminderDue,
  isWithinQuietHours,
  parseTimeToMinutes,
  shouldSendBrowserPush,
} from './notifications.js';

test('parseTimeToMinutes parses valid HH:MM strings and rejects invalid inputs', () => {
  assert.equal(parseTimeToMinutes('07:30'), 450);
  assert.equal(parseTimeToMinutes('22:00'), 1320);
  assert.equal(parseTimeToMinutes('25:00'), null);
  assert.equal(parseTimeToMinutes('bad'), null);
});

test('isWithinQuietHours handles overnight and daytime quiet windows', () => {
  const overnightPrefs = { quietHoursEnabled: true, quietStart: '22:00', quietEnd: '07:00' };
  assert.equal(isWithinQuietHours(overnightPrefs, new Date(2026, 10, 17, 23, 15)), true);
  assert.equal(isWithinQuietHours(overnightPrefs, new Date(2026, 10, 17, 6, 45)), true);
  assert.equal(isWithinQuietHours(overnightPrefs, new Date(2026, 10, 17, 14, 0)), false);

  const daytimePrefs = { quietHoursEnabled: true, quietStart: '13:00', quietEnd: '15:00' };
  assert.equal(isWithinQuietHours(daytimePrefs, new Date(2026, 10, 17, 13, 30)), true);
  assert.equal(isWithinQuietHours(daytimePrefs, new Date(2026, 10, 17, 15, 0)), false);

  assert.equal(
    isWithinQuietHours({ ...overnightPrefs, quietHoursEnabled: false }, new Date(2026, 10, 17, 23, 15)),
    false
  );
});

test('shouldSendBrowserPush enforces push toggle, quiet hours, and category prefs', () => {
  const basePrefs = {
    browserPushEnabled: true,
    mealReminders: true,
    hydrationAlerts: true,
    illnessCheckins: true,
    quietHoursEnabled: true,
    quietStart: '22:00',
    quietEnd: '07:00',
  };
  const daytime = new Date(2026, 10, 17, 11, 30);
  const night = new Date(2026, 10, 17, 22, 30);

  assert.equal(shouldSendBrowserPush(basePrefs, 'Meal Reminder', daytime), true);
  assert.equal(shouldSendBrowserPush(basePrefs, 'Hydration', night), false);
  assert.equal(shouldSendBrowserPush({ ...basePrefs, browserPushEnabled: false }, 'Hydration', daytime), false);
  assert.equal(shouldSendBrowserPush({ ...basePrefs, mealReminders: false }, 'Meal Reminder', daytime), false);
});

test('isHydrationReminderDue triggers only after interval elapses outside quiet hours', () => {
  const prefs = {
    hydrationAlerts: true,
    hydrationIntervalEnabled: true,
    hydrationReminderIntervalHours: 2,
    quietHoursEnabled: true,
    quietStart: '22:00',
    quietEnd: '07:00',
  };
  const dayNow = new Date(2026, 10, 17, 14, 0);
  const nowMs = dayNow.getTime();
  const oneHourAgo = nowMs - 60 * 60 * 1000;
  const twoHoursAgo = nowMs - 2 * 60 * 60 * 1000;

  assert.equal(isHydrationReminderDue({ lastReminderAt: oneHourAgo }, prefs, nowMs, dayNow), false);
  assert.equal(isHydrationReminderDue({ lastReminderAt: twoHoursAgo }, prefs, nowMs, dayNow), true);

  const nightNow = new Date(2026, 10, 17, 23, 0);
  assert.equal(
    isHydrationReminderDue({ lastReminderAt: nightNow.getTime() - 3 * 60 * 60 * 1000 }, prefs, nightNow.getTime(), nightNow),
    false
  );
});

test('clampWaterGlasses and formatHHMM bound and format values cleanly', () => {
  assert.equal(clampWaterGlasses(-2), 0);
  assert.equal(clampWaterGlasses(5), 5);
  assert.equal(clampWaterGlasses(99), 16);
  assert.equal(formatHHMM(new Date(2026, 10, 17, 8, 5)), '08:05');
});

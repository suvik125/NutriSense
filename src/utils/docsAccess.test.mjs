import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDocsLiveMetrics,
  evaluateDocsAccess,
  exportDocsToMarkdown,
  filterDocsNavItems,
} from './docsAccess.js';
import { DEFAULT_DOCS_CONTENT, DOCS_NAV_ITEMS } from '../data/docsDefaults.js';

test('evaluateDocsAccess permits access by default when visibilityEnabled is true and mode is always', () => {
  const res = evaluateDocsAccess({ visibilityEnabled: true, scheduleMode: 'always' }, 1700000000000);
  assert.equal(res.allowed, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.reason, 'ok');
});

test('evaluateDocsAccess blocks access with 403 when visibilityEnabled is false', () => {
  const res = evaluateDocsAccess({ visibilityEnabled: false, scheduleMode: 'always' }, 1700000000000);
  assert.equal(res.allowed, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.reason, 'disabled');
});

test('evaluateDocsAccess enforces scheduled start and end windows cleanly', () => {
  const start = '2026-11-20T09:00:00Z';
  const end = '2026-11-22T18:00:00Z';

  const before = evaluateDocsAccess(
    { visibilityEnabled: true, scheduleMode: 'scheduled', startAt: start, endAt: end },
    Date.parse('2026-11-20T08:00:00Z')
  );
  assert.equal(before.allowed, false);
  assert.equal(before.reason, 'before_window');

  const during = evaluateDocsAccess(
    { visibilityEnabled: true, scheduleMode: 'scheduled', startAt: start, endAt: end },
    Date.parse('2026-11-21T12:00:00Z')
  );
  assert.equal(during.allowed, true);

  const after = evaluateDocsAccess(
    { visibilityEnabled: true, scheduleMode: 'scheduled', startAt: start, endAt: end },
    Date.parse('2026-11-22T19:00:00Z')
  );
  assert.equal(after.allowed, false);
  assert.equal(after.reason, 'after_window');
});

test('evaluateDocsAccess enforces duration-based publishing windows', () => {
  const start = '2026-11-20T00:00:00Z';
  const inside = evaluateDocsAccess(
    { visibilityEnabled: true, scheduleMode: 'duration', startAt: start, durationHours: 48 },
    Date.parse('2026-11-21T10:00:00Z')
  );
  assert.equal(inside.allowed, true);

  const expired = evaluateDocsAccess(
    { visibilityEnabled: true, scheduleMode: 'duration', startAt: start, durationHours: 48 },
    Date.parse('2026-11-22T01:00:00Z')
  );
  assert.equal(expired.allowed, false);
  assert.equal(expired.reason, 'after_window');
});

test('computeDocsLiveMetrics aggregates safely even with empty or partial inputs', () => {
  const emptyMetrics = computeDocsLiveMetrics(undefined, undefined);
  assert.equal(emptyMetrics.authStatus, 'Public Preview Mode');
  assert.equal(emptyMetrics.targetCalories, 2150);

  const populated = computeDocsLiveMetrics(
    {
      isAuthenticated: true,
      isDemoMode: false,
      foodLogs: [{ id: '1' }, { id: '2' }],
      nutritionTargets: { targetCalories: 1950 },
      profile: { illnessMode: 'cold' },
    },
    {
      MEAL_CATALOG: { breakfast: [{}, {}], lunch: [{}] },
      RECOVERY_MEALS: { cold: { breakfast: {}, lunch: {} } },
      ILLNESS_OPTIONS: [{ id: 'none' }, { id: 'cold' }, { id: 'fever' }],
      HEALTH_CONDITIONS: ['Hypertension', 'PCOS'],
      ALLERGY_OPTIONS: ['Dairy', 'Gluten', 'Fish'],
      ANALYZER_PRESETS: [{}, {}],
    }
  );
  assert.equal(populated.catalogMealCount, 3);
  assert.equal(populated.recoveryMealCount, 2);
  assert.equal(populated.totalMealTemplates, 5);
  assert.equal(populated.illnessModes, 2);
  assert.equal(populated.logsCount, 2);
  assert.equal(populated.targetCalories, 1950);
  assert.equal(populated.authStatus, 'Supabase Authenticated');
});

test('exportDocsToMarkdown includes NutriSense, event, DIU_Coderunners team, and technical sections', () => {
  const md = exportDocsToMarkdown(DEFAULT_DOCS_CONTENT, computeDocsLiveMetrics({}, {}));
  assert.ok(md.includes('# NutriSense'));
  assert.ok(md.includes('International AI Builders Congress 2026 (CloudCampBD)'));
  assert.ok(md.includes('Tahsin Rahman Tanisha'));
  assert.ok(md.includes('Suvik Sarker Ronggon'));
  assert.ok(md.includes('Saifur Shihab'));
  assert.ok(md.includes('Kawsar Bhuiyan'));
  assert.ok(md.includes('Musfiq Faisal'));
  assert.ok(md.includes('## G. API Documentation'));
});

test('filterDocsNavItems narrows sections by search keyword', () => {
  const filtered = filterDocsNavItems(DOCS_NAV_ITEMS, 'gemini');
  assert.ok(filtered.some((i) => i.id === 'docs-ai'));
  assert.equal(filterDocsNavItems(DOCS_NAV_ITEMS, '').length, DOCS_NAV_ITEMS.length);
});

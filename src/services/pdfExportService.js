// src/services/pdfExportService.js
// Print-ready A4 PDF Report Generator (zero external dependencies, full Bangla + English Unicode support)

import { DAYS_OF_WEEK, ILLNESS_OPTIONS } from '../data/catalog.js';
import { formatNumber, getTodayISO, summarizeDailyLogs } from '../utils/nutrition.js';

const REPORT_TITLES = {
  meal_plan: '7-Day Adaptive Meal Plan',
  food_logs: 'Food Log & Intake History',
  nutrition_profile: 'Personal Nutrition Profile & Targets',
  full_report: 'Complete NutriSense Health & Diet Report',
};

export function getPdfReportLabel(reportType) {
  return REPORT_TITLES[reportType] || REPORT_TITLES.full_report;
}

function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderProfileSection(state) {
  const profile = state?.profile || {};
  const bio = profile.biometrics || {};
  const targets = state?.nutritionTargets || {};
  const hydration = state?.hydration || { glasses: 0, goalGlasses: 8 };
  const illnessObj =
    ILLNESS_OPTIONS.find((item) => item.id === profile.illnessMode) || ILLNESS_OPTIONS[0];

  const conditions =
    Array.isArray(profile.healthConditions) && profile.healthConditions.length > 0
      ? profile.healthConditions.join(', ')
      : 'None reported';
  const allergies =
    Array.isArray(profile.allergies) && profile.allergies.length > 0
      ? profile.allergies.join(', ')
      : 'None reported';

  return `
    <section class="section">
      <h2>1. Personal Biometrics &amp; Daily Nutrition Targets</h2>
      <div class="grid-4">
        <div class="stat-card">
          <div class="stat-label">Daily Calorie Target</div>
          <div class="stat-value">${formatNumber(targets.targetCalories)} kcal</div>
          <div class="stat-sub">BMR: ${formatNumber(targets.bmr)} · TDEE: ${formatNumber(targets.tdee)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Macro Split (P / C / F)</div>
          <div class="stat-value">${targets.proteinG || 0}g / ${targets.carbsG || 0}g / ${targets.fatG || 0}g</div>
          <div class="stat-sub">Fiber Target: ${targets.fiberG || 0}g/day</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">BMI Status</div>
          <div class="stat-value">${targets.bmi || '-'}</div>
          <div class="stat-sub">${escapeHtml(targets.bmiCategory || 'Healthy')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Wellness Mode &amp; Water</div>
          <div class="stat-value">${escapeHtml(illnessObj.shortLabel)}</div>
          <div class="stat-sub">Hydration: ${hydration.glasses || 0}/${hydration.goalGlasses || 8} glasses</div>
        </div>
      </div>

      <table class="meta-table">
        <tbody>
          <tr>
            <th>Member Name</th>
            <td>${escapeHtml(profile.name || 'Member')}</td>
            <th>Goal / Activity</th>
            <td>${escapeHtml(bio.goal || 'recomp')} · ${escapeHtml(bio.activityLevel || 'moderate')}</td>
          </tr>
          <tr>
            <th>Biometrics</th>
            <td>Age ${escapeHtml(bio.age || '-')} · ${escapeHtml(bio.gender || '-')} · ${escapeHtml(bio.heightCm || '-')} cm · ${escapeHtml(bio.weightKg || '-')} kg</td>
            <th>Micronutrients</th>
            <td>Iron ${targets.ironMg || 0}mg · Ca ${targets.calciumMg || 0}mg · Vit D ${targets.vitaminDMcg || 0}mcg · Na &le; ${targets.sodiumMg || 2300}mg</td>
          </tr>
          <tr>
            <th>Health Conditions</th>
            <td>${escapeHtml(conditions)}</td>
            <th>Allergies / Filters</th>
            <td>${escapeHtml(allergies)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
}

function renderMealPlanSection(state) {
  const mealPlan = state?.mealPlan || { days: {} };
  const illnessObj =
    ILLNESS_OPTIONS.find((item) => item.id === (mealPlan.adaptedForIllness || 'none')) ||
    ILLNESS_OPTIONS[0];

  const rowsHtml = DAYS_OF_WEEK.map((day) => {
    const slots = mealPlan.days?.[day] || {};
    const b = slots.breakfast || {};
    const l = slots.lunch || {};
    const s = slots.snack || {};
    const d = slots.dinner || {};
    const dayTotal =
      (Number(b.calories) || 0) +
      (Number(l.calories) || 0) +
      (Number(s.calories) || 0) +
      (Number(d.calories) || 0);
    const dayProtein =
      (Number(b.proteinG) || 0) +
      (Number(l.proteinG) || 0) +
      (Number(s.proteinG) || 0) +
      (Number(d.proteinG) || 0);

    const cell = (meal) =>
      meal?.name
        ? `<strong>${escapeHtml(meal.name)}</strong><br/><span class="muted">${meal.calories || 0} kcal · P ${meal.proteinG || 0}g · C ${meal.carbsG || 0}g · F ${meal.fatG || 0}g</span>`
        : '<span class="muted">—</span>';

    return `
      <tr>
        <td><strong>${day}</strong><br/><span class="muted">${formatNumber(dayTotal)} kcal<br/>${dayProtein}g P</span></td>
        <td>${cell(b)}</td>
        <td>${cell(l)}</td>
        <td>${cell(s)}</td>
        <td>${cell(d)}</td>
      </tr>
    `;
  }).join('');

  return `
    <section class="section">
      <h2>Weekly Adaptive Meal Plan (${escapeHtml(illnessObj.label)})</h2>
      <p class="note-box">${escapeHtml(mealPlan.wellnessSummary || illnessObj.guidance)}</p>
      <table>
        <thead>
          <tr>
            <th style="width: 10%;">Day</th>
            <th style="width: 22.5%;">Breakfast</th>
            <th style="width: 22.5%;">Lunch</th>
            <th style="width: 22.5%;">Snack</th>
            <th style="width: 22.5%;">Dinner</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </section>
  `;
}

function renderFoodLogsSection(state) {
  const logs = Array.isArray(state?.foodLogs) ? state.foodLogs : [];
  const todayISO = getTodayISO();
  const todayTotals = summarizeDailyLogs(logs, todayISO);
  const targetKcal = state?.nutritionTargets?.targetCalories || 2000;
  const remainingKcal = Math.max(0, targetKcal - todayTotals.calories);

  const rowsHtml = logs.length
    ? logs
        .slice(0, 30)
        .map(
          (item) => `
          <tr>
            <td>${escapeHtml(item.dateISO)}<br/><span class="muted">${escapeHtml(item.timeLabel || '')}</span></td>
            <td><strong>${escapeHtml(item.name)}</strong><br/><span class="muted">${escapeHtml(item.portion || '')}</span></td>
            <td>${escapeHtml(item.mealType || 'Meal')}</td>
            <td><strong>${formatNumber(item.calories)}</strong> kcal</td>
            <td>P ${item.proteinG || 0}g · C ${item.carbsG || 0}g · F ${item.fatG || 0}g · Fib ${item.fiberG || 0}g</td>
            <td>${escapeHtml(item.source || 'Log')}</td>
          </tr>
        `
        )
        .join('')
    : '<tr><td colspan="6" style="text-align:center;color:#666;">No food entries logged yet.</td></tr>';

  return `
    <section class="section">
      <h2>Food Log &amp; Calorie Tracking Summary</h2>
      <div class="grid-4">
        <div class="stat-card">
          <div class="stat-label">Today Logged (${todayISO})</div>
          <div class="stat-value">${formatNumber(todayTotals.calories)} kcal</div>
          <div class="stat-sub">${todayTotals.count} meal(s) recorded</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Remaining Today</div>
          <div class="stat-value">${formatNumber(remainingKcal)} kcal</div>
          <div class="stat-sub">Of ${formatNumber(targetKcal)} kcal goal</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Today Protein / Carbs</div>
          <div class="stat-value">${todayTotals.proteinG}g / ${todayTotals.carbsG}g</div>
          <div class="stat-sub">Fat: ${todayTotals.fatG}g · Fiber: ${todayTotals.fiberG}g</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Logged Entries</div>
          <div class="stat-value">${logs.length}</div>
          <div class="stat-sub">Showing up to 30 recent logs</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date / Time</th>
            <th>Food Item</th>
            <th>Meal</th>
            <th>Calories</th>
            <th>Macros</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </section>
  `;
}

function buildPrintableHtml(reportType, state) {
  const title = getPdfReportLabel(reportType);
  const generatedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const memberName = state?.profile?.name || 'NutriSense User';

  let bodySections = '';
  if (reportType === 'meal_plan') {
    bodySections = `${renderProfileSection(state)}${renderMealPlanSection(state)}`;
  } else if (reportType === 'food_logs') {
    bodySections = `${renderFoodLogsSection(state)}`;
  } else if (reportType === 'nutrition_profile') {
    bodySections = `${renderProfileSection(state)}`;
  } else {
    bodySections = `${renderProfileSection(state)}${renderMealPlanSection(state)}${renderFoodLogsSection(state)}`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>NutriSense — ${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", Arial, sans-serif;
      color: #18181b;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 3px solid #84cc16;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #09090b;
    }
    .brand span { color: #65a30d; }
    .subtitle { font-size: 13px; font-weight: 600; color: #3f3f46; margin-top: 2px; }
    .meta { text-align: right; font-size: 10px; color: #52525b; }
    .section { margin-bottom: 18px; page-break-inside: avoid; }
    h2 {
      font-size: 13px;
      font-weight: 700;
      color: #09090b;
      margin: 0 0 8px 0;
      padding-left: 8px;
      border-left: 3px solid #84cc16;
    }
    .note-box {
      background: #f7fee7;
      border: 1px solid #d9f99d;
      border-radius: 6px;
      padding: 8px 10px;
      margin: 0 0 10px 0;
      color: #365314;
      font-size: 10.5px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .stat-card {
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      padding: 8px 10px;
      background: #fafafa;
    }
    .stat-label { font-size: 9.5px; color: #71717a; text-transform: uppercase; letter-spacing: 0.03em; }
    .stat-value { font-size: 14px; font-weight: 800; color: #09090b; margin-top: 2px; }
    .stat-sub { font-size: 9.5px; color: #52525b; margin-top: 2px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #e4e4e7;
      padding: 6px 7px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f4f4f5;
      font-weight: 700;
      color: #27272a;
    }
    .meta-table th { width: 16%; background: #fafafa; }
    .muted { color: #71717a; font-size: 9.2px; }
    .footer {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px solid #e4e4e7;
      font-size: 9.5px;
      color: #71717a;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Nutri<span>Sense</span> AI</div>
      <div class="subtitle">${escapeHtml(title)}</div>
    </div>
    <div class="meta">
      <div><strong>Prepared for:</strong> ${escapeHtml(memberName)}</div>
      <div><strong>Generated:</strong> ${escapeHtml(generatedAt)}</div>
    </div>
  </div>

  ${bodySections}

  <div class="footer">
    <span>NutriSense · Personalized Nutrition &amp; Adaptive Diet System</span>
    <span>Informational guidance only — not a substitute for clinical medical advice.</span>
  </div>
</body>
</html>`;
}

/**
 * Triggers a clean A4 Save-as-PDF / Print dialog using a hidden iframe (never blocked by popup blockers).
 */
export function exportNutriSensePDF(reportType = 'full_report', state = {}) {
  if (typeof document === 'undefined') {
    return { ok: false, error: 'PDF export is only available in the browser.' };
  }

  try {
    const html = buildPrintableHtml(reportType, state);
    const existing = document.getElementById('nutrisense-pdf-print-frame');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'nutrisense-pdf-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) {
      iframe.remove();
      return { ok: false, error: 'Unable to initialize PDF print frame.' };
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => iframe.remove(), 3000);
      }
    }, 220);

    return {
      ok: true,
      reportType,
      title: getPdfReportLabel(reportType),
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Failed to generate PDF report.',
    };
  }
}

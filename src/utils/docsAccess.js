// Pure access-control evaluation, live metrics aggregation, search, and Markdown export helpers for /docs

function parseTimestamp(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function formatScheduleLabel(ms) {
  if (!Number.isFinite(ms)) return '';
  try {
    return new Date(ms).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(ms).toISOString();
  }
}

/**
 * Evaluates whether public readers can currently access /docs.
 * Supports immediate ON/OFF toggle, explicit start/end schedule window, and duration-based publishing.
 */
export function evaluateDocsAccess(config, nowMs = Date.now()) {
  const safe = config && typeof config === 'object' ? config : {};
  const enabled = safe.visibilityEnabled !== false;

  if (!enabled) {
    return {
      allowed: false,
      statusCode: 403,
      reason: 'disabled',
      summaryText: 'Documentation access is currently paused by the NutriSense administrator.',
    };
  }

  const mode = safe.scheduleMode || 'always';
  if (mode === 'always') {
    return {
      allowed: true,
      statusCode: 200,
      reason: 'ok',
      summaryText: 'Publicly visible (always available).',
    };
  }

  const startMs = parseTimestamp(safe.startAt);
  let endMs = parseTimestamp(safe.endAt);

  if (mode === 'duration') {
    const durationHours = Math.max(1, Number(safe.durationHours) || 24);
    const anchorMs = startMs ?? parseTimestamp(safe.publishedAt) ?? nowMs;
    endMs = anchorMs + durationHours * 3600 * 1000;
    if (nowMs < anchorMs) {
      return {
        allowed: false,
        statusCode: 403,
        reason: 'before_window',
        summaryText: `Scheduled publishing opens ${formatScheduleLabel(anchorMs)}.`,
      };
    }
    if (nowMs > endMs) {
      return {
        allowed: false,
        statusCode: 403,
        reason: 'after_window',
        summaryText: `The ${durationHours}-hour showcase window ended on ${formatScheduleLabel(endMs)}.`,
      };
    }
    return {
      allowed: true,
      statusCode: 200,
      reason: 'ok',
      summaryText: `Active ${durationHours}h publishing window until ${formatScheduleLabel(endMs)}.`,
    };
  }

  // mode === 'scheduled'
  if (startMs !== null && nowMs < startMs) {
    return {
      allowed: false,
      statusCode: 403,
      reason: 'before_window',
      summaryText: `Scheduled access begins on ${formatScheduleLabel(startMs)}.`,
    };
  }

  if (endMs !== null && nowMs > endMs) {
    return {
      allowed: false,
      statusCode: 403,
      reason: 'after_window',
      summaryText: `Scheduled access window closed on ${formatScheduleLabel(endMs)}.`,
    };
  }

  if (startMs !== null && endMs !== null) {
    return {
      allowed: true,
      statusCode: 200,
      reason: 'ok',
      summaryText: `Live window: ${formatScheduleLabel(startMs)} – ${formatScheduleLabel(endMs)}.`,
    };
  }

  return {
    allowed: true,
    statusCode: 200,
    reason: 'ok',
    summaryText: 'Publicly visible within scheduled window.',
  };
}

/**
 * Safely derives real-time runtime metrics from NutriSense store & catalog without crashing on partial state.
 */
export function computeDocsLiveMetrics(state, catalog = {}) {
  try {
    const mealCatalog = catalog.MEAL_CATALOG || {};
    const catalogMealCount = Object.values(mealCatalog).reduce(
      (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
      0
    );

    const recoveryMeals = catalog.RECOVERY_MEALS || {};
    const recoveryMealCount = Object.values(recoveryMeals).reduce(
      (sum, slots) => sum + (slots && typeof slots === 'object' ? Object.keys(slots).length : 0),
      0
    );

    const illnessModes = Array.isArray(catalog.ILLNESS_OPTIONS)
      ? catalog.ILLNESS_OPTIONS.filter((opt) => opt?.id && opt.id !== 'none').length
      : 5;

    const healthConditionCount = Array.isArray(catalog.HEALTH_CONDITIONS)
      ? catalog.HEALTH_CONDITIONS.length
      : 5;

    const allergyOptionCount = Array.isArray(catalog.ALLERGY_OPTIONS)
      ? catalog.ALLERGY_OPTIONS.length
      : 8;

    const scannerPresetCount = Array.isArray(catalog.ANALYZER_PRESETS)
      ? catalog.ANALYZER_PRESETS.length
      : 3;

    const logsCount = Array.isArray(state?.foodLogs) ? state.foodLogs.length : 0;
    const targetCalories = Number(state?.nutritionTargets?.targetCalories) || 2150;
    const activeIllness = state?.profile?.illnessMode || 'none';
    const authStatus = state?.isAuthenticated
      ? state?.isDemoMode
        ? 'Demo Session Active'
        : 'Supabase Authenticated'
      : 'Public Preview Mode';

    return {
      catalogMealCount,
      recoveryMealCount,
      totalMealTemplates: catalogMealCount + recoveryMealCount,
      illnessModes,
      healthConditionCount,
      allergyOptionCount,
      scannerPresetCount,
      logsCount,
      targetCalories,
      activeIllness,
      authStatus,
      liveFeatureCount: 7,
      supabaseTablesCount: 9,
    };
  } catch {
    return {
      catalogMealCount: 16,
      recoveryMealCount: 20,
      totalMealTemplates: 36,
      illnessModes: 5,
      healthConditionCount: 5,
      allergyOptionCount: 8,
      scannerPresetCount: 3,
      logsCount: 0,
      targetCalories: 2150,
      activeIllness: 'none',
      authStatus: 'Public Preview Mode',
      liveFeatureCount: 7,
      supabaseTablesCount: 9,
    };
  }
}

export function filterDocsNavItems(items, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const hay = `${item.title} ${item.keywords || ''}`.toLowerCase();
    return hay.includes(q);
  });
}

export function exportDocsToMarkdown(docsData, liveMetrics) {
  const lines = [];
  const meta = docsData?.meta || {};
  const pitch = docsData?.pitch || {};
  const team = Array.isArray(docsData?.team) ? docsData.team : [];
  const features = Array.isArray(docsData?.features) ? docsData.features : [];
  const techStack = Array.isArray(docsData?.techStack) ? docsData.techStack : [];
  const sections = docsData?.technicalSections || {};

  lines.push(`# ${meta.productName || 'NutriSense'} — Pitch Deck & Technical Documentation`);
  lines.push(`**Event:** ${meta.event || 'International AI Builders Congress 2026 (CloudCampBD)'}`);
  lines.push(`**Team:** ${meta.teamName || 'DIU_Coderunners'} (${meta.university || 'Daffodil International University — DIU'})`);
  lines.push(`**Version:** ${meta.version || 'v1.0.0'} | **Live Meals:** ${liveMetrics?.totalMealTemplates || 36} | **Supabase Tables:** ${liveMetrics?.supabaseTablesCount || 9}`);
  lines.push('');

  lines.push('## A. YC-Style Pitch Deck');
  (pitch.slides || []).forEach((slide) => {
    lines.push(`### ${slide.label}: ${slide.title}`);
    lines.push(slide.body);
    if (Array.isArray(slide.bullets) && slide.bullets.length) {
      slide.bullets.forEach((b) => lines.push(`- ${b}`));
    }
    lines.push('');
  });

  lines.push('## Team — DIU_Coderunners');
  team.forEach((m) => {
    lines.push(`- **${m.name}** — ${m.role} | GitHub: \`@${m.github}\`${m.email ? ` | Email: ${m.email}` : ''}`);
  });
  lines.push('');

  lines.push('## B. Product Overview');
  lines.push(sections.productOverview || '');
  lines.push('');

  lines.push('## C. Feature Matrix');
  lines.push('| Feature | Status | Scope | Notes |');
  lines.push('| --- | --- | --- | --- |');
  features.forEach((f) => {
    lines.push(`| ${f.name} | ${f.status} | ${f.scope} | ${f.summary} |`);
  });
  lines.push('');

  lines.push('## D. Architecture & E. Data Flow');
  lines.push('- **Architecture:** User Browser (Vite / Vanilla JS ES6+) -> Supabase Auth & PostgreSQL (RLS) + Google Gemini AI API (with Local Fallback) -> Vercel Edge Hosting');
  lines.push('- **Data Flow:** Biometrics Input -> Mifflin-St Jeor Nutrition Engine -> Supabase Persistence (user_health_profiles, nutrition_targets) -> Weekly Meal Plan & AI Context -> User Feedback');
  lines.push('');

  lines.push('## F. Technology Stack');
  techStack.forEach((t) => {
    lines.push(`- **${t.layer}:** ${t.stack} — ${t.details}`);
  });
  lines.push('');

  const orderedTechKeys = [
    ['G. API Documentation', 'apiDocs'],
    ['H. Data Layer & Security Schema', 'dataLayer'],
    ['I. AI Layer & Fallback Engine', 'aiLayer'],
    ['J. Product Roadmap', 'roadmap'],
    ['K. Performance & Scalability', 'performance'],
    ['L. Security & Privacy', 'security'],
    ['M. Analytics & Telemetry', 'analytics'],
    ['N. Team & Contributors', 'contributors'],
    ['O. Changelog', 'changelog'],
  ];

  orderedTechKeys.forEach(([heading, key]) => {
    if (sections[key]) {
      lines.push(`## ${heading}`);
      lines.push(sections[key]);
      lines.push('');
    }
  });

  return lines.join('\n');
}

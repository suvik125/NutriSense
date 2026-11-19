// src/services/ragChatbotService.js
// Agentic RAG Copilot: Grounded Q&A + Live System Control + PDF Export

import { DAYS_OF_WEEK, ILLNESS_OPTIONS, MEAL_CATALOG } from '../data/catalog.js';
import { YOLO_NUTRITION_DB } from '../data/yoloFoodCatalog.js';
import { findAllergyConflicts, getTodayISO, summarizeDailyLogs } from '../utils/nutrition.js';
import { retrieveRagContext } from './ragKnowledgeBase.js';
import { exportNutriSensePDF, getPdfReportLabel } from './pdfExportService.js';
import { showToast } from '../components/toast.js';

export const ASSISTANT_QUICK_REPLIES = [
  'Download my weekly meal plan as PDF',
  'I have a fever, activate recovery mode & open planner',
  'Log 2 glasses of water & check today remaining calories',
  'Log 1 plate Rui Fish Curry for lunch',
  'How many calories in Kacchi Biryani vs Khichuri?',
  'Switch to light mode & regenerate today meal plan',
];

const VALID_VIEWS = new Set(['home', 'calculator', 'planner', 'scanner', 'myfoods']);
const VALID_ILLNESSES = new Set(['none', 'fever', 'cold', 'stomach', 'sore_throat', 'fatigue']);
const VALID_SLOTS = new Set(['breakfast', 'lunch', 'snack', 'dinner']);
const VALID_REPORTS = new Set(['meal_plan', 'food_logs', 'nutrition_profile', 'full_report']);

function cleanEnv(val) {
  return String(val || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
}

function normalizeDay(input, fallbackDay = 'Mon') {
  const raw = String(input || '').trim().toLowerCase();
  const map = {
    mon: 'Mon', monday: 'Mon',
    tue: 'Tue', tuesday: 'Tue',
    wed: 'Wed', wednesday: 'Wed',
    thu: 'Thu', thursday: 'Thu',
    fri: 'Fri', friday: 'Fri',
    sat: 'Sat', saturday: 'Sat',
    sun: 'Sun', sunday: 'Sun',
  };
  return map[raw] || (DAYS_OF_WEEK.includes(fallbackDay) ? fallbackDay : 'Mon');
}

function findFoodInDatabases(foodQuery) {
  const q = String(foodQuery || '').toLowerCase().trim();
  if (!q) return null;

  if (YOLO_NUTRITION_DB[q]) return YOLO_NUTRITION_DB[q];

  const yoloList = Object.values(YOLO_NUTRITION_DB);
  const yoloMatch =
    yoloList.find((item) => item.key.replace(/_/g, ' ') === q) ||
    yoloList.find((item) => item.name.toLowerCase().includes(q)) ||
    yoloList.find((item) => q.includes(item.key.replace(/_/g, ' ')));
  if (yoloMatch) return yoloMatch;

  const catalogItems = Object.values(MEAL_CATALOG).flat();
  const catMatch =
    catalogItems.find((m) => m.name.toLowerCase().includes(q)) ||
    catalogItems.find((m) => q.includes(m.name.toLowerCase()));
  if (catMatch) return catMatch;

  const tokens = q.split(/\s+/).filter((w) => w.length >= 3);
  if (tokens.length > 0) {
    let best = null;
    let bestHits = 0;
    [...yoloList, ...catalogItems].forEach((item) => {
      const hay = `${item.name} ${item.key || ''}`.toLowerCase();
      const hits = tokens.filter((t) => hay.includes(t)).length;
      if (hits > bestHits) {
        bestHits = hits;
        best = item;
      }
    });
    if (best && bestHits >= 1) return best;
  }

  return null;
}

function detectDeterministicActions(userMessage, state) {
  const q = String(userMessage || '').toLowerCase();
  const actions = [];

  if (/\b(pdf|download|export|print|report)\b/i.test(q)) {
    let reportType = 'full_report';
    if (/\b(meal\s*plan|weekly|diet\s*plan|routine)\b/i.test(q)) {
      reportType = 'meal_plan';
    } else if (/\b(food\s*log|history|intake|eaten|logged)\b/i.test(q)) {
      reportType = 'food_logs';
    } else if (/\b(profile|target|bmi|macro|biometric)\b/i.test(q)) {
      reportType = 'nutrition_profile';
    }
    if (/\b(pdf|export|download|print)\b/i.test(q)) {
      actions.push({ type: 'export_pdf', reportType });
    }
  }

  if (/\b(dark\s*mode|dark\s*theme)\b/i.test(q)) {
    actions.push({ type: 'set_theme', theme: 'dark' });
  } else if (/\b(light\s*mode|light\s*theme)\b/i.test(q)) {
    actions.push({ type: 'set_theme', theme: 'light' });
  } else if (/\b(toggle\s*theme|switch\s*theme|change\s*theme)\b/i.test(q)) {
    actions.push({ type: 'set_theme', theme: 'toggle' });
  }

  const wantsIllnessChange =
    /\b(mode|activate|set|switch|turn\s*on|have|feeling|sick|ill|recover|recovering|amar|ache|hoyeche)\b/i.test(q);
  if (wantsIllnessChange) {
    if (/\b(fever|jor|জ্বর)\b/i.test(q)) {
      actions.push({ type: 'set_illness_mode', illnessMode: 'fever' });
    } else if (/\b(cold|congestion|sordi|thanda|সর্দি|ঠান্ডা)\b/i.test(q)) {
      actions.push({ type: 'set_illness_mode', illnessMode: 'cold' });
    } else if (/\b(stomach|upset|gastric|acidity|diarrhea|pet\s*kharap)\b/i.test(q)) {
      actions.push({ type: 'set_illness_mode', illnessMode: 'stomach' });
    } else if (/\b(sore\s*throat|throat|gola\s*byatha)\b/i.test(q)) {
      actions.push({ type: 'set_illness_mode', illnessMode: 'sore_throat' });
    } else if (/\b(fatigue|tired|exhausted|weak|klanto|durbol)\b/i.test(q)) {
      actions.push({ type: 'set_illness_mode', illnessMode: 'fatigue' });
    } else if (/\b(normal\s*mode|feeling\s*great|reset\s*illness|turn\s*off\s*recovery|healthy\s*mode)\b/i.test(q)) {
      actions.push({ type: 'set_illness_mode', illnessMode: 'none' });
    }
  }

  const waterMatch = q.match(/(?:log|add|drank|drink|khaisi|kheyechi)\s+(\d+)?\s*(?:glass|glasses|cup|cups)?\s*(?:of\s+)?(?:water|pani|jol)/i);
  if (waterMatch) {
    const qty = Math.max(1, Math.min(8, Number(waterMatch[1]) || 1));
    actions.push({ type: 'log_water', glasses: qty });
  } else if (/\b(reset\s*water|clear\s*water)\b/i.test(q)) {
    actions.push({ type: 'log_water', reset: true });
  }

  if (/\b(regenerate|refresh|new)\b.*\b(weekly|week|full)\b.*\b(meal|plan)\b/i.test(q)) {
    actions.push({ type: 'regenerate_meal_plan' });
  } else if (/\b(regenerate|refresh)\b.*\b(today|mon|tue|wed|thu|fri|sat|sun|day|meal\s*plan)\b/i.test(q)) {
    const dayMatch = q.match(/\b(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday)\b/i);
    const targetDay = dayMatch
      ? normalizeDay(dayMatch[1], state?.selectedPlannerDay)
      : state?.selectedPlannerDay || 'Mon';
    actions.push({ type: 'regenerate_day_plan', day: targetDay });
  } else if (/\b(swap|change|replace)\b.*\b(breakfast|lunch|snack|dinner)\b/i.test(q)) {
    const slotMatch = q.match(/\b(breakfast|lunch|snack|dinner)\b/i);
    const dayMatch = q.match(/\b(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday)\b/i);
    actions.push({
      type: 'swap_meal',
      day: dayMatch ? normalizeDay(dayMatch[1], state?.selectedPlannerDay) : state?.selectedPlannerDay || 'Mon',
      slot: slotMatch[1].toLowerCase(),
    });
  }

  if (/\b(log|add|record|track)\b/i.test(q) && !/\b(water|pani|jol|pdf|food\s*log)\b/i.test(q)) {
    const mealTypeMatch = q.match(/\b(breakfast|lunch|snack|dinner)\b/i);
    const cleanedFoodPhrase = q
      .replace(/\b(please|can you|log|add|record|track|me|my|for|as|to|1|2|plate|bowl|cup|piece|pieces|serving|of|breakfast|lunch|snack|dinner|food)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const matchedFood = findFoodInDatabases(cleanedFoodPhrase);
    if (matchedFood) {
      actions.push({
        type: 'log_food',
        foodName: matchedFood.name,
        foodKey: matchedFood.key || null,
        mealType: mealTypeMatch
          ? mealTypeMatch[1].charAt(0).toUpperCase() + mealTypeMatch[1].slice(1).toLowerCase()
          : matchedFood.mealType || 'Lunch',
      });
    }
  }

  if (/\b(open|go\s*to|show|navigate|switch\s*to)\b/i.test(q)) {
    if (/\b(planner|meal\s*plan)\b/i.test(q) && !/\b(pdf|download|export)\b/i.test(q)) {
      actions.push({ type: 'navigate', view: 'planner' });
    } else if (/\b(scanner|photo\s*scan|camera)\b/i.test(q)) {
      actions.push({ type: 'navigate', view: 'scanner' });
    } else if (/\b(calculator|bmi|profile|targets)\b/i.test(q) && !/\b(pdf|download|export)\b/i.test(q)) {
      actions.push({ type: 'navigate', view: 'calculator' });
    } else if (/\b(my\s*foods|myfoods|food\s*history|logs)\b/i.test(q) && !/\b(pdf|download|export)\b/i.test(q)) {
      actions.push({ type: 'navigate', view: 'myfoods' });
    } else if (/\b(home|dashboard)\b/i.test(q)) {
      actions.push({ type: 'navigate', view: 'home' });
    } else if (/\b(notifications|reminders)\b/i.test(q)) {
      actions.push({ type: 'open_notifications' });
    }
  }

  return actions;
}

async function executeSystemActions(rawActions = [], storeInstance) {
  const executed = [];
  let pdfAction = null;
  const seen = new Set();

  for (const act of rawActions) {
    if (!act || !act.type) continue;
    const sig = JSON.stringify(act);
    if (seen.has(sig)) continue;
    seen.add(sig);

    const state = storeInstance.getState();

    switch (act.type) {
      case 'navigate': {
        const view = String(act.view || '').toLowerCase();
        if (VALID_VIEWS.has(view)) {
          await storeInstance.setView(view);
          executed.push(`Navigated to ${view.charAt(0).toUpperCase() + view.slice(1)}`);
        }
        break;
      }

      case 'set_theme': {
        const desired = String(act.theme || 'toggle').toLowerCase();
        if (desired === 'toggle' || (desired === 'dark' && state.theme !== 'dark') || (desired === 'light' && state.theme !== 'light')) {
          storeInstance.toggleTheme();
          const nextTheme = storeInstance.getState().theme;
          executed.push(`Switched theme to ${nextTheme} mode`);
          showToast(`Theme switched to ${nextTheme} mode`);
        }
        break;
      }

      case 'set_illness_mode': {
        const mode = String(act.illnessMode || 'none').toLowerCase();
        if (VALID_ILLNESSES.has(mode)) {
          await storeInstance.setIllnessMode(mode);
          const info = ILLNESS_OPTIONS.find((i) => i.id === mode);
          executed.push(`Recovery Mode → ${info?.label || mode}`);
          showToast(`Meal plan adapted: ${info?.label || mode}`);
        }
        break;
      }

      case 'regenerate_meal_plan': {
        await storeInstance.generateMealPlan();
        executed.push('Regenerated 7-day weekly meal plan');
        showToast('Weekly meal plan regenerated');
        break;
      }

      case 'regenerate_day_plan': {
        const day = normalizeDay(act.day, state.selectedPlannerDay);
        await storeInstance.regenerateDay(day);
        storeInstance.setSelectedPlannerDay(day);
        executed.push(`Regenerated ${day} meal plan`);
        showToast(`Refreshed meals for ${day}`);
        break;
      }

      case 'swap_meal': {
        const day = normalizeDay(act.day, state.selectedPlannerDay);
        const slot = String(act.slot || '').toLowerCase();
        if (VALID_SLOTS.has(slot)) {
          const nextMeal = storeInstance.swapMeal(day, slot);
          storeInstance.setSelectedPlannerDay(day);
          executed.push(`Swapped ${day} ${slot} → ${nextMeal?.name || 'new dish'}`);
          showToast(`Swapped ${day} ${slot}`);
        }
        break;
      }

      case 'log_water': {
        if (act.reset) {
          storeInstance.resetWaterTracker();
          executed.push('Reset daily water tracker');
        } else {
          const delta = Math.max(1, Math.min(8, Number(act.glasses) || 1));
          storeInstance.addWaterGlass(delta);
          const h = storeInstance.getState().hydration;
          executed.push(`Logged +${delta} glass${delta > 1 ? 'es' : ''} water (${h.glasses}/${h.goalGlasses})`);
          showToast(`Hydration updated: ${h.glasses}/${h.goalGlasses} glasses`);
        }
        break;
      }

      case 'log_food': {
        const dbMatch = findFoodInDatabases(act.foodKey || act.foodName);
        if (dbMatch) {
          const conflicts = findAllergyConflicts(dbMatch.allergens || [], state.profile.allergies || []);
          const logged = await storeInstance.addFoodLog({
            name: dbMatch.name,
            mealType: act.mealType || dbMatch.mealType || 'Lunch',
            calories: dbMatch.calories,
            proteinG: dbMatch.proteinG,
            carbsG: dbMatch.carbsG,
            fatG: dbMatch.fatG,
            fiberG: dbMatch.fiberG || 0,
            portion: dbMatch.portion || '1 serving',
            image: dbMatch.image,
            allergens: dbMatch.allergens || [],
            source: 'AI Copilot',
          });
          if (logged) {
            const warnText = conflicts.length > 0 ? ` (Allergy alert: ${conflicts.join(', ')})` : '';
            executed.push(`Logged ${dbMatch.name} (+${dbMatch.calories} kcal)${warnText}`);
            showToast(`Logged ${dbMatch.name}`);
          }
        }
        break;
      }

      case 'open_notifications': {
        storeInstance.setUI({ notificationsOpen: true });
        executed.push('Opened Notifications & Reminders drawer');
        break;
      }

      case 'mark_notifications_read': {
        storeInstance.markAllNotificationsRead();
        executed.push('Marked all notifications as read');
        break;
      }

      case 'export_pdf': {
        const reportType = VALID_REPORTS.has(act.reportType) ? act.reportType : 'full_report';
        const res = exportNutriSensePDF(reportType, storeInstance.getState());
        pdfAction = {
          reportType,
          title: getPdfReportLabel(reportType),
        };
        if (res.ok) {
          executed.push(`Exported PDF: ${res.title}`);
          showToast(`Opening PDF print/save for ${res.title}`);
        }
        break;
      }

      default:
        break;
    }
  }

  return { executed, pdfAction };
}

async function callGeminiRagEngine(userMessage, ragResult, state) {
  const recentHistory = (state?.chatHistory || [])
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n');

  const prompt = `You are NutriSense AI Copilot — an intelligent RAG-powered nutritionist and live app controller tailored for Bangladeshi and global diets.

STRICT RULES:
1. Answer strictly using the RETRIEVED RAG CONTEXT below whenever referencing nutrition values, user stats, meal plans, or food logs. Cite source tags like [S1], [S2] naturally.
2. Reply in the SAME language the user used (English, Bangla, or Banglish). Keep answers clear, structured with short bullets, and practical.
3. Always warn if a food triggers any of the user's allergies.
4. Include a brief 1-line note when giving illness/health suggestions that it is informational and not medical advice.
5. If the user asks to control the app or export a PDF, include the matching action object(s) in "actions". ONLY include actions the user actually requested.

AVAILABLE ACTIONS SCHEMA:
- {"type": "navigate", "view": "home" | "calculator" | "planner" | "scanner" | "myfoods"}
- {"type": "set_theme", "theme": "dark" | "light" | "toggle"}
- {"type": "set_illness_mode", "illnessMode": "none" | "fever" | "cold" | "stomach" | "sore_throat" | "fatigue"}
- {"type": "regenerate_meal_plan"}
- {"type": "regenerate_day_plan", "day": "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"}
- {"type": "swap_meal", "day": "Mon".."Sun", "slot": "breakfast" | "lunch" | "snack" | "dinner"}
- {"type": "log_water", "glasses": 1..8, "reset": false}
- {"type": "log_food", "foodName": "exact or closest food name", "mealType": "Breakfast" | "Lunch" | "Snack" | "Dinner"}
- {"type": "open_notifications"}
- {"type": "mark_notifications_read"}
- {"type": "export_pdf", "reportType": "meal_plan" | "food_logs" | "nutrition_profile" | "full_report"}

RETRIEVED RAG CONTEXT:
${ragResult.contextText}

RECENT CONVERSATION:
${recentHistory || 'None'}

CURRENT USER MESSAGE:
${userMessage}

Return ONLY valid JSON with this exact shape:
{
  "reply": "Your helpful grounded markdown response here",
  "actions": []
}`;

  try {
    const proxyRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (proxyRes.ok) {
      const contentType = proxyRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const parsed = await proxyRes.json();
        if (parsed && typeof parsed.reply === 'string') {
          return {
            reply: parsed.reply,
            actions: Array.isArray(parsed.actions) ? parsed.actions : [],
            mode: parsed.mode || 'gemini-rag-server',
          };
        }
      }
    }
  } catch {
    // Fall through to local dev fallback if running plain Vite without /api route
  }

  const devApiKey = cleanEnv(import.meta.env?.VITE_GEMINI_API_KEY);
  if (!devApiKey) return null;

  const preferredModel = cleanEnv(import.meta.env?.VITE_GEMINI_MODEL) || 'gemini-2.5-flash';
  const candidateModels = Array.from(
    new Set([preferredModel, 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'])
  );

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(devApiKey)}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) continue;
      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.reply === 'string') {
        return {
          reply: parsed.reply,
          actions: Array.isArray(parsed.actions) ? parsed.actions : [],
          mode: `gemini-rag-local (${model})`,
        };
      }
    } catch {
      // Try next candidate
    }
  }

  return null;
}

function buildLocalRagFallbackReply(userMessage, ragResult, state, executedActions) {
  const today = getTodayISO();
  const todayTotals = summarizeDailyLogs(state?.foodLogs || [], today);
  const targets = state?.nutritionTargets || {};
  const remainingKcal = Math.max(0, (targets.targetCalories || 2000) - todayTotals.calories);
  const remainingProtein = Math.max(0, (targets.proteinG || 140) - todayTotals.proteinG);

  const lines = [];

  if (executedActions.length > 0) {
    lines.push(`**Done!** I executed the requested updates on NutriSense:`);
    executedActions.forEach((a) => lines.push(`- ${a}`));
    lines.push('');
  }

  const domainChunks = ragResult.retrievedChunks
    .filter((c) => !c.id.startsWith('live:'))
    .slice(0, 3);

  if (domainChunks.length > 0) {
    lines.push(`**Grounded NutriSense Knowledge:**`);
    domainChunks.forEach((chunk) => {
      const idx = ragResult.retrievedChunks.findIndex((c) => c.id === chunk.id) + 1;
      const warn =
        chunk.allergyConflicts.length > 0
          ? ` *(Allergy Alert: ${chunk.allergyConflicts.join(', ')})*`
          : '';
      lines.push(
        `- **${chunk.title} [S${idx}]${warn}:** ${chunk.content.slice(0, 220)}${chunk.content.length > 220 ? '...' : ''}`
      );
    });
    lines.push('');
  }

  if (
    domainChunks.length === 0 ||
    /\b(remaining|left|today|target|koto|ajker|progress|compare)\b/i.test(userMessage)
  ) {
    lines.push(
      `**Today's Progress (${today}) [S1]:**`,
      `- **Consumed:** ${todayTotals.calories} / ${targets.targetCalories} kcal (**${remainingKcal} kcal left**)`,
      `- **Macros Logged:** ${todayTotals.proteinG}g Protein (${remainingProtein}g left) · ${todayTotals.carbsG}g Carbs · ${todayTotals.fatG}g Fat`,
      `- **Hydration:** ${state?.hydration?.glasses || 0}/${state?.hydration?.goalGlasses || 8} glasses`
    );
  }

  lines.push('', '_Informational nutrition guidance only — not medical advice._');
  return lines.join('\n');
}

export async function processRagChatMessage(userMessage, storeInstance) {
  const stateBefore = storeInstance.getState();
  const ragResult = retrieveRagContext(userMessage, stateBefore, 6);

  const deterministicActions = detectDeterministicActions(userMessage, stateBefore);
  const geminiResult = await callGeminiRagEngine(userMessage, ragResult, stateBefore);

  const combinedActions = [
    ...(geminiResult?.actions || []),
    ...deterministicActions,
  ];

  const { executed, pdfAction } = await executeSystemActions(combinedActions, storeInstance);

  const finalState = storeInstance.getState();
  const text = geminiResult?.reply
    ? geminiResult.reply
    : buildLocalRagFallbackReply(userMessage, ragResult, finalState, executed);

  return {
    text,
    meta: {
      mode: geminiResult?.mode || 'local-rag',
      sources: ragResult.sources,
      actionsExecuted: executed,
      pdfAction,
    },
  };
}

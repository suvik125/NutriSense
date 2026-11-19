// src/services/ragKnowledgeBase.js
// Hybrid RAG Knowledge Base & BM25-style Retriever for NutriSense (English + Bangla/Banglish)

import {
  ANALYZER_PRESETS,
  DAYS_OF_WEEK,
  ILLNESS_OPTIONS,
  MEAL_CATALOG,
  NUTRI_NOTES,
  RECOVERY_MEALS,
} from '../data/catalog.js';
import { YOLO_NUTRITION_DB } from '../data/yoloFoodCatalog.js';
import { findAllergyConflicts, getTodayISO, summarizeDailyLogs } from '../utils/nutrition.js';

const STOP_WORDS = new Set([
  'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'and', 'in', 'that', 'have',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by',
  'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would',
  'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'can', 'please', 'tell', 'give', 'show', 'how', 'much', 'many', 'should', 'could', 'ami', 'amar',
  'tumi', 'koro', 'korbo', 'ki', 'kemon', 'koto', 'ache', 'khabo', 'chai', 'dao', 'daw', 'er', 'ta',
]);

// Bangla & Banglish -> English domain expansion map for accurate hybrid retrieval
const SYNONYM_MAP = {
  jor: ['fever', 'jau', 'porridge', 'recovery'],
  'জ্বর': ['fever', 'jau', 'porridge', 'recovery'],
  thanda: ['cold', 'congestion', 'ginger', 'soup'],
  sordi: ['cold', 'congestion', 'ginger', 'soup'],
  'সর্দি': ['cold', 'congestion', 'ginger', 'soup'],
  'ঠান্ডা': ['cold', 'congestion', 'ginger'],
  pet: ['stomach', 'gut', 'khichuri', 'congee'],
  gastric: ['stomach', 'bland', 'congee', 'khichuri'],
  'পেট': ['stomach', 'gut', 'congee'],
  gola: ['sore_throat', 'throat', 'honey', 'soothing'],
  'গলা': ['sore_throat', 'throat', 'honey'],
  klanto: ['fatigue', 'energy', 'chira', 'recovery'],
  durbol: ['fatigue', 'energy', 'recovery'],
  bhaat: ['rice', 'plain_rice', 'steamed'],
  vat: ['rice', 'plain_rice'],
  'ভাত': ['rice', 'plain_rice'],
  mach: ['fish', 'rohu', 'rui', 'ilish', 'curry'],
  maach: ['fish', 'rohu', 'rui', 'ilish'],
  'মাছ': ['fish', 'rohu', 'rui', 'ilish'],
  ilish: ['ilish_bhuna', 'hilsa', 'fish'],
  'ইলিশ': ['ilish_bhuna', 'hilsa', 'fish'],
  dim: ['egg', 'omelette', 'egg_curry'],
  'ডিম': ['egg', 'omelette', 'egg_curry'],
  murgi: ['chicken', 'chicken_curry', 'chicken_roast', 'morog_polao'],
  'মুরগি': ['chicken', 'chicken_curry', 'roast'],
  goru: ['beef', 'beef_kala_bhuna', 'beef_tehari'],
  'গরু': ['beef', 'beef_kala_bhuna', 'beef_tehari'],
  dal: ['masoor_dal', 'lentil', 'moong'],
  'ডাল': ['masoor_dal', 'lentil', 'moong'],
  bhorta: ['alu_bhorta_platter', 'bhorta', 'mashed'],
  'ভর্তা': ['alu_bhorta_platter', 'bhorta'],
  shak: ['shak_bhaji', 'spinach', 'iron', 'greens'],
  'শাক': ['shak_bhaji', 'spinach', 'iron'],
  biryani: ['kacchi_biryani', 'chicken_biryani', 'biryani'],
  kacchi: ['kacchi_biryani', 'mutton', 'biryani'],
  'কাচ্চি': ['kacchi_biryani', 'biryani'],
  khichuri: ['bhuna_khichuri', 'khichuri'],
  'খিচুড়ি': ['bhuna_khichuri', 'khichuri'],
  ruti: ['roti_paratha', 'paratha', 'haluwa'],
  porotha: ['roti_paratha', 'paratha'],
  'রুটি': ['roti_paratha', 'paratha'],
  pani: ['hydration', 'water', 'glasses'],
  jol: ['hydration', 'water', 'glasses'],
  'পানি': ['hydration', 'water', 'glasses'],
  ojon: ['weight', 'bmi', 'fat', 'loss', 'calories'],
  'ওজন': ['weight', 'bmi', 'fat', 'loss', 'calories'],
  diet: ['meal', 'plan', 'weekly', 'calories', 'macros'],
  pdf: ['pdf', 'export', 'download', 'report'],
  allergy: ['allergies', 'allergens', 'safe', 'conflict'],
  diabetes: ['diabetes', 'blood', 'sugar', 'carbs', 'fiber'],
  pressure: ['hypertension', 'sodium', 'salt'],
};

let staticDocsCache = null;

function tokenize(text) {
  const rawTokens = String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

  const expanded = [...rawTokens];
  rawTokens.forEach((tok) => {
    if (SYNONYM_MAP[tok]) {
      expanded.push(...SYNONYM_MAP[tok]);
    }
  });
  return expanded;
}

function buildStaticDocuments() {
  if (staticDocsCache) return staticDocsCache;
  const docs = [];

  // 1. Meal Catalog (Breakfast, Lunch, Snack, Dinner)
  Object.entries(MEAL_CATALOG).forEach(([slot, items]) => {
    items.forEach((m) => {
      docs.push({
        id: `catalog:${m.id}`,
        category: 'Meal Catalog',
        title: `${m.name} (${slot})`,
        allergens: m.allergens || [],
        content: `Meal Catalog [${slot}]: ${m.name}. Portion: ${m.portion}. Calories: ${m.calories} kcal, Protein: ${m.proteinG}g, Carbs: ${m.carbsG}g, Fat: ${m.fatG}g, Fiber: ${m.fiberG}g. Prep: ${m.prepMins} mins. Tags: ${(m.tags || []).join(', ')}. Allergens: ${(m.allergens || []).join(', ') || 'None'}.`,
      });
    });
  });

  // 2. Illness Options & Recovery Meals
  ILLNESS_OPTIONS.forEach((opt) => {
    const rec = RECOVERY_MEALS[opt.id];
    const mealsSummary = rec
      ? Object.entries(rec)
          .map(
            ([slot, m]) =>
              `${slot}: ${m.name} (${m.calories} kcal, P ${m.proteinG}g, C ${m.carbsG}g, F ${m.fatG}g, allergens: ${(m.allergens || []).join(', ') || 'none'})`
          )
          .join(' | ')
      : 'Standard balanced meals.';

    docs.push({
      id: `illness:${opt.id}`,
      category: 'Recovery & Illness Guide',
      title: `Illness Mode: ${opt.label}`,
      allergens: [],
      content: `Illness Recovery Protocol for ${opt.label} (${opt.id}): ${opt.guidance} Recommended Bangladeshi recovery meals: ${mealsSummary}`,
    });
  });

  // 3. YOLO 39+ Bangladeshi & Global Food Nutrition DB
  Object.values(YOLO_NUTRITION_DB).forEach((food) => {
    docs.push({
      id: `fooddb:${food.key}`,
      category: 'Nutrition DB',
      title: food.name,
      foodKey: food.key,
      allergens: food.allergens || [],
      content: `Food Nutrition Database (${food.key}): ${food.name}. Typical meal: ${food.mealType}. Portion: ${food.portion}. Calories: ${food.calories} kcal, Protein: ${food.proteinG}g, Carbs: ${food.carbsG}g, Fat: ${food.fatG}g, Fiber: ${food.fiberG}g, Sodium: ${food.sodiumMg}mg, Iron: ${food.ironMg}mg. Ingredients: ${(food.ingredients || []).join(', ')}. Allergens: ${(food.allergens || []).join(', ') || 'None'}.`,
    });
  });

  // 4. Analyzer Presets
  ANALYZER_PRESETS.forEach((p) => {
    docs.push({
      id: `preset:${p.id}`,
      category: 'Scanner Preset',
      title: p.name,
      allergens: p.allergens || [],
      content: `Photo Scanner Preset: ${p.name} (${p.mealType}). Portion: ${p.portion}. Calories: ${p.calories} kcal, Protein: ${p.proteinG}g, Carbs: ${p.carbsG}g, Fat: ${p.fatG}g, Fiber: ${p.fiberG}g, Sodium: ${p.sodiumMg}mg, Iron: ${p.ironMg}mg. Ingredients: ${(p.ingredients || []).join(', ')}.`,
    });
  });

  // 5. Nutrition Notes
  NUTRI_NOTES.forEach((n, idx) => {
    docs.push({
      id: `note:${idx + 1}`,
      category: 'Nutrition Science',
      title: n.topic,
      allergens: [],
      content: `Nutrition Insight — ${n.topic}: ${n.note}`,
    });
  });

  // 6. System Capabilities Doc
  docs.push({
    id: 'system:capabilities',
    category: 'App Guide',
    title: 'NutriSense System Controls & PDF Export',
    allergens: [],
    content:
      'NutriSense features: 1) Home Dashboard (calories, macros, hydration), 2) Calculator (Mifflin-St Jeor BMR/TDEE/BMI, conditions, allergies), 3) Meal Planner (7-day adaptive Bangladeshi plan, illness recovery modes: fever, cold, stomach, sore_throat, fatigue, swap/regenerate meals), 4) Photo Scanner (YOLOv8n ONNX food recognition & nutrition estimation), 5) My Foods (logged food history & 7/30-day charts). Chatbot can directly switch pages, toggle dark/light theme, activate illness mode, log water glasses, log meals from the database, swap or regenerate meal plans, and export PDF reports (meal_plan, food_logs, nutrition_profile, full_report).',
  });

  // Pre-tokenize static docs
  staticDocsCache = docs.map((d) => ({
    ...d,
    tokens: tokenize(`${d.title} ${d.category} ${d.content}`),
  }));
  return staticDocsCache;
}

function buildLiveUserDocuments(state) {
  const docs = [];
  const profile = state?.profile || {};
  const bio = profile.biometrics || {};
  const targets = state?.nutritionTargets || {};
  const today = getTodayISO();
  const todaySummary = summarizeDailyLogs(state?.foodLogs || [], today);
  const hydration = state?.hydration || { glasses: 0, goalGlasses: 8 };

  const remainingCalories = Math.max(0, (targets.targetCalories || 2000) - todaySummary.calories);
  const remainingProtein = Math.max(0, (targets.proteinG || 140) - todaySummary.proteinG);

  const userSummaryDoc = {
    id: 'live:user_profile',
    category: 'Live User Profile',
    title: `${profile.name || 'User'} Profile & Targets`,
    allergens: [],
    content: `Current User: ${profile.name || 'Member'} | Goal: ${bio.goal || 'recomp'} | Age: ${bio.age}, Gender: ${bio.gender}, Height: ${bio.heightCm}cm, Weight: ${bio.weightKg}kg, Activity: ${bio.activityLevel}, Job: ${bio.jobType}. Health Conditions: ${(profile.healthConditions || []).join(', ') || 'None'}. Allergies: ${(profile.allergies || []).join(', ') || 'None'}. Active Illness Mode: ${profile.illnessMode || 'none'}. Daily Targets: ${targets.targetCalories} kcal (BMR ${targets.bmr}, TDEE ${targets.tdee}, BMI ${targets.bmi} ${targets.bmiCategory}), Protein ${targets.proteinG}g, Carbs ${targets.carbsG}g, Fat ${targets.fatG}g, Fiber ${targets.fiberG}g, Iron ${targets.ironMg}mg, Calcium ${targets.calciumMg}mg, Vitamin D ${targets.vitaminDMcg}mcg, Sodium max ${targets.sodiumMg}mg. Today (${today}) Consumed: ${todaySummary.calories} kcal, ${todaySummary.proteinG}g protein, ${todaySummary.carbsG}g carbs, ${todaySummary.fatG}g fat, ${todaySummary.fiberG}g fiber across ${todaySummary.count} logs. Remaining Today: ${remainingCalories} kcal and ${remainingProtein}g protein. Hydration Today: ${hydration.glasses}/${hydration.goalGlasses} glasses of water.`,
  };

  docs.push(userSummaryDoc);

  // Recent Food Logs doc
  const recentLogs = (state?.foodLogs || []).slice(0, 12);
  if (recentLogs.length > 0) {
    const logLines = recentLogs
      .map(
        (l) =>
          `${l.dateISO} ${l.timeLabel} [${l.mealType}] ${l.name} (${l.calories} kcal, P ${l.proteinG}g, C ${l.carbsG}g, F ${l.fatG}g)`
      )
      .join(' ; ');
    docs.push({
      id: 'live:food_logs',
      category: 'Live Food Logs',
      title: 'Recent Logged Meals',
      allergens: [],
      content: `User's Recent Food Logs: ${logLines}`,
    });
  }

  // Active Weekly Meal Plan doc (per selected day + full summary)
  const planDays = state?.mealPlan?.days || {};
  const planLines = DAYS_OF_WEEK.map((day) => {
    const d = planDays[day] || {};
    return `${day}: Breakfast=${d.breakfast?.name || '-'} (${d.breakfast?.calories || 0}kcal), Lunch=${d.lunch?.name || '-'} (${d.lunch?.calories || 0}kcal), Snack=${d.snack?.name || '-'} (${d.snack?.calories || 0}kcal), Dinner=${d.dinner?.name || '-'} (${d.dinner?.calories || 0}kcal)`;
  }).join(' | ');

  docs.push({
    id: 'live:meal_plan',
    category: 'Live Meal Plan',
    title: `Active 7-Day Meal Plan (Selected: ${state?.selectedPlannerDay || 'Mon'})`,
    allergens: [],
    content: `User's Active Weekly Meal Plan (Adapted for: ${state?.mealPlan?.adaptedForIllness || 'none'}): ${planLines}`,
  });

  return docs.map((d) => ({
    ...d,
    tokens: tokenize(`${d.title} ${d.category} ${d.content}`),
  }));
}

/**
 * Retrieves top-K grounded knowledge chunks using BM25-inspired TF-IDF scoring + allergy tagging.
 */
export function retrieveRagContext(query, state, topK = 6) {
  const staticDocs = buildStaticDocuments();
  const liveDocs = buildLiveUserDocuments(state);
  const allDocs = [...liveDocs, ...staticDocs];

  const queryTokens = tokenize(query);
  const uniqueQueryTokens = Array.from(new Set(queryTokens));
  const rawQueryLower = String(query || '').toLowerCase();
  const userAllergies = state?.profile?.allergies || [];

  // Document frequency for IDF calculation
  const N = allDocs.length;
  const df = new Map();
  allDocs.forEach((doc) => {
    const seen = new Set(doc.tokens);
    seen.forEach((tok) => df.set(tok, (df.get(tok) || 0) + 1));
  });

  const avgLen =
    allDocs.reduce((sum, d) => sum + d.tokens.length, 0) / Math.max(1, allDocs.length);
  const k1 = 1.4;
  const b = 0.7;

  const scored = allDocs.map((doc) => {
    const tfMap = new Map();
    doc.tokens.forEach((tok) => tfMap.set(tok, (tfMap.get(tok) || 0) + 1));

    let score = 0;
    uniqueQueryTokens.forEach((qTok) => {
      const tf = tfMap.get(qTok) || 0;
      if (tf > 0) {
        const docFreq = df.get(qTok) || 1;
        const idf = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);
        const norm = tf * (k1 + 1) / (tf + k1 * (1 - b + (b * doc.tokens.length) / avgLen));
        score += idf * norm;
      }
    });

    // Exact title or key substring bonus
    const titleLower = doc.title.toLowerCase();
    if (rawQueryLower.length >= 3 && titleLower.includes(rawQueryLower)) {
      score += 4.0;
    } else {
      uniqueQueryTokens.forEach((qTok) => {
        if (qTok.length >= 3 && titleLower.includes(qTok)) {
          score += 1.2;
        }
      });
    }

    // Boost live user docs when query uses personal pronouns or tracking terms
    if (
      doc.id.startsWith('live:') &&
      /\b(my|today|remaining|left|plan|log|target|calorie|protein|water|bmi|amar|ajker|koto)\b/i.test(
        rawQueryLower
      )
    ) {
      score += 1.8;
    }

    const conflicts = findAllergyConflicts(doc.allergens || [], userAllergies);

    return {
      ...doc,
      score: Math.round(score * 100) / 100,
      allergyConflicts: conflicts,
    };
  });

  // Always include live user profile snapshot + top-K highest scoring unique docs
  const userProfileChunk = scored.find((d) => d.id === 'live:user_profile');
  const rankedOthers = scored
    .filter((d) => d.id !== 'live:user_profile' && d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // If query was very generic (e.g., "hi"), include live meal plan & capabilities
  if (rankedOthers.length === 0) {
    const fallbackIds = new Set(['live:meal_plan', 'live:food_logs', 'system:capabilities']);
    scored
      .filter((d) => fallbackIds.has(d.id))
      .forEach((d) => rankedOthers.push({ ...d, score: 0.5 }));
  }

  const retrievedChunks = userProfileChunk ? [userProfileChunk, ...rankedOthers] : rankedOthers;

  const contextText = retrievedChunks
    .map((chunk, idx) => {
      const warning =
        chunk.allergyConflicts.length > 0
          ? ` [ALLERGY WARNING FOR USER: contains ${chunk.allergyConflicts.join(', ')}]`
          : '';
      return `[S${idx + 1} | ${chunk.category} | ${chunk.title}]${warning}\n${chunk.content}`;
    })
    .join('\n\n');

  const sources = retrievedChunks.map((chunk, idx) => ({
    ref: `S${idx + 1}`,
    id: chunk.id,
    title: chunk.title,
    category: chunk.category,
    score: chunk.score,
    hasAllergyConflict: chunk.allergyConflicts.length > 0,
  }));

  return {
    userProfileChunk,
    retrievedChunks,
    contextText,
    sources,
  };
}

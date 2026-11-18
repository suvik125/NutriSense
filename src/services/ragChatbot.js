// src/services/ragChatbot.js
import {
  ANALYZER_PRESETS,
  HEALTH_CONDITIONS,
  ILLNESS_OPTIONS,
  MEAL_CATALOG,
  NUTRI_NOTES,
  RECOVERY_MEALS,
} from '../data/catalog.js';
import { YOLO_NUTRITION_DB } from '../data/yoloFoodCatalog.js';
import {
  GOAL_ADJUSTMENTS,
  findAllergyConflicts,
  formatNumber,
  getCurrentDayShortName,
  getOffsetDateISO,
  getTodayISO,
  summarizeDailyLogs,
} from '../utils/nutrition.js';

// Banglish, Bengali & English Synonym Map for Retrieval
const SYNONYM_ALIASES = {
  kacchi_biryani: ['kacchi', 'kachi', 'mutton biryani', 'কাচ্চি', 'বিরিয়ানি', 'বিরিয়ানি'],
  chicken_biryani: ['chicken biryani', 'biryani', 'biriyani', 'চিকেন বিরিয়ানি', 'চিকেন বিরিয়ানি'],
  morog_polao: ['polao', 'pulao', 'morog polao', 'পোলাও', 'মোরগ পোলাও'],
  beef_tehari: ['tehari', 'teheri', 'beef tehari', 'তেহারি', 'গরুর তেহারি'],
  plain_rice: ['plain rice', 'white rice', 'bhaat', 'bhat', 'steamed rice', 'ভাত', 'সাদা ভাত'],
  bhuna_khichuri: ['khichuri', 'khichdi', 'bhuna khichuri', 'খিচুড়ি', 'খিচুড়ি'],
  ilish_bhuna: ['ilish', 'hilsa', 'shorshe ilish', 'ইলিশ', 'সর্ষে ইলিশ'],
  rohu_fish_curry: ['rui', 'rohu', 'katla', 'fish curry', 'mach', 'machher jhol', 'রুই', 'মাছ', 'মাছের ঝোল'],
  chingri_malaikari: ['chingri', 'prawn', 'shrimp', 'malaikari', 'চিংড়ি', 'চিংড়ি'],
  beef_kala_bhuna: ['kala bhuna', 'kalabhuna', 'beef', 'gorur mangsho', 'কালা ভুনা', 'গরুর মাংস'],
  chicken_curry: ['chicken curry', 'murgi', 'murgir jhol', 'মুরগি', 'মুরগির ঝোল'],
  chicken_roast: ['chicken roast', 'roast', 'biye barir roast', 'রোস্ট', 'চিকেন রোস্ট'],
  egg_curry: ['egg curry', 'dim', 'dimer jhol', 'omelette', 'ডিম', 'ডিমের ঝোল'],
  masoor_dal: ['dal', 'daal', 'lentil', 'masoor dal', 'ডাল', 'মসুর ডাল'],
  alu_bhorta_platter: ['bhorta', 'vorta', 'alu bhorta', 'shutki', 'begun bhorta', 'ভর্তা', 'আলু ভর্তা'],
  shak_bhaji: ['shak', 'saag', 'spinach', 'lal shak', 'palong', 'শাক', 'লাল শাক', 'পালং শাক'],
  mixed_veg_labra: ['mixed veg', 'sabzi', 'sobji', 'labra', 'vegetable', 'সবজি'],
  roti_paratha: ['ruti', 'roti', 'paratha', 'porota', 'porotha', 'রুটি', 'পরোটা'],
  luchi_puri: ['luchi', 'puri', 'dal puri', 'লুচি', 'পুরি'],
  butter_naan: ['naan', 'nan', 'butter naan', 'নান', 'বাটার নান'],
  singara: ['singara', 'shingara', 'সিঙ্গারা'],
  samosa: ['samosa', 'somucha', 'সমুচা'],
  fuchka_chotpoti: ['fuchka', 'phuchka', 'chotpoti', 'ফুচকা', 'চটপটি'],
  jhalmuri: ['jhalmuri', 'muri', 'chanachur', 'ঝালমুড়ি', 'ঝালমুড়ি', 'মুড়ি', 'চানাচুর'],
  shahi_haleem: ['haleem', 'halim', 'হালিম'],
  mishti_doi_sweet: ['doi', 'mishti doi', 'rosogolla', 'roshogolla', 'jilapi', 'sweet', 'দই', 'মিষ্টি'],
  fried_rice: ['fried rice', 'ফ্রাইড রাইস'],
  burger: ['burger', 'বার্গার'],
  pizza: ['pizza', 'পিৎজা', 'পিজ্জা'],
  salad: ['salad', 'shosha', 'cucumber', 'সালাদ'],
  sandwich: ['sandwich', 'স্যান্ডউইচ'],
  banana: ['banana', 'kola', 'কলা'],
  apple: ['apple', 'আপেল'],
  orange: ['orange', 'malta', 'komola', 'কমলা', 'মাল্টা'],
  broccoli: ['broccoli', 'ব্রকলি'],
  carrot: ['carrot', 'gajor', 'গাজর'],
  donut: ['donut', 'ডোনাট'],
  cake: ['cake', 'pastry', 'কেক'],
};

const DAY_ALIASES = {
  mon: 'Mon', monday: 'Mon', সোম: 'Mon', সোমবার: 'Mon',
  tue: 'Tue', tuesday: 'Tue', মঙ্গল: 'Tue', মঙ্গলবার: 'Tue',
  wed: 'Wed', wednesday: 'Wed', বুধ: 'Wed', বুধবার: 'Wed',
  thu: 'Thu', thursday: 'Thu', বৃহস্পতি: 'Thu', বৃহস্পতিবার: 'Thu',
  fri: 'Fri', friday: 'Fri', শুক্র: 'Fri', শুক্রবার: 'Fri',
  sat: 'Sat', saturday: 'Sat', শনি: 'Sat', শনিবার: 'Sat',
  sun: 'Sun', sunday: 'Sun', রবি: 'Sun', রবিবার: 'Sun',
};

const SLOT_ALIASES = {
  breakfast: 'breakfast', সকাল: 'breakfast', নাস্তা: 'breakfast', ব্রেকফাস্ট: 'breakfast', morning: 'breakfast',
  lunch: 'lunch', দুপুর: 'lunch', লাঞ্চ: 'lunch', noon: 'lunch',
  snack: 'snack', বিকেল: 'snack', স্ন্যাকস: 'snack', নাস্তা_বিকেল: 'snack', snacking: 'snack',
  dinner: 'dinner', রাত: 'dinner', ডিনার: 'dinner', night: 'dinner',
};

const ILLNESS_KEYWORDS = [
  { id: 'fever', words: ['fever', 'temperature', 'jwor', 'jor', 'জ্বর'] },
  { id: 'cold', words: ['cold', 'cough', 'congestion', 'flu', 'sordi', 'kashi', 'thanda', 'সর্দি', 'কাশি', 'ঠান্ডা'] },
  { id: 'stomach', words: ['stomach', 'acidity', 'gastric', 'diarrhea', 'indigestion', 'pet', 'পেট', 'গ্যাস্ট্রিক', 'বদহজম'] },
  { id: 'sore_throat', words: ['sore throat', 'throat', 'tonsil', 'gola', 'গলা ব্যথা', 'গলা'] },
  { id: 'fatigue', words: ['fatigue', 'tired', 'weak', 'exhausted', 'klanto', 'durbol', 'ক্লান্ত', 'দুর্বল'] },
  { id: 'none', words: ['feeling great', 'normal mode', 'recovered', 'fine now', 'সুস্থ', 'নরমাল'] },
];

/**
 * 1. Build Unified RAG Knowledge Base from all NutriSense catalogs
 */
export function buildFoodKnowledgeIndex() {
  const index = [];
  const seenNames = new Set();

  // A. Index YOLO_NUTRITION_DB (40+ Bengali & Global foods)
  Object.entries(YOLO_NUTRITION_DB).forEach(([key, item]) => {
    seenNames.add(item.name.toLowerCase());
    index.push({
      id: key,
      source: 'Food Analyzer Catalog',
      name: item.name,
      slot: (item.mealType || 'Lunch').toLowerCase(),
      mealType: item.mealType || 'Lunch',
      portion: item.portion,
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      fiberG: item.fiberG,
      sodiumMg: item.sodiumMg || 380,
      ironMg: item.ironMg || 2.0,
      allergens: item.allergens || [],
      ingredients: item.ingredients || [],
      image: item.image,
      keywords: [
        key.replace(/_/g, ' '),
        item.name.toLowerCase(),
        ...(SYNONYM_ALIASES[key] || []),
        ...(item.ingredients || []).map((i) => i.toLowerCase()),
      ],
    });
  });

  // B. Index MEAL_CATALOG (Planner Meals)
  Object.entries(MEAL_CATALOG).forEach(([slot, list]) => {
    list.forEach((meal) => {
      if (seenNames.has(meal.name.toLowerCase())) return;
      seenNames.add(meal.name.toLowerCase());
      index.push({
        id: meal.id,
        source: `Meal Planner (${slot})`,
        name: meal.name,
        slot,
        mealType: slot.charAt(0).toUpperCase() + slot.slice(1),
        portion: meal.portion,
        calories: meal.calories,
        proteinG: meal.proteinG,
        carbsG: meal.carbsG,
        fatG: meal.fatG,
        fiberG: meal.fiberG,
        sodiumMg: 340,
        ironMg: 2.2,
        allergens: meal.allergens || [],
        ingredients: meal.tags || [],
        image: meal.image,
        keywords: [meal.name.toLowerCase(), slot, ...(meal.tags || []).map((t) => t.toLowerCase())],
      });
    });
  });

  // C. Index RECOVERY_MEALS (Illness-specific gentle meals)
  Object.entries(RECOVERY_MEALS).forEach(([illnessId, slots]) => {
    Object.entries(slots).forEach(([slot, meal]) => {
      index.push({
        id: meal.id,
        source: `Recovery Plan (${illnessId})`,
        name: meal.name,
        slot,
        mealType: slot.charAt(0).toUpperCase() + slot.slice(1),
        illnessMode: illnessId,
        portion: meal.portion,
        calories: meal.calories,
        proteinG: meal.proteinG,
        carbsG: meal.carbsG,
        fatG: meal.fatG,
        fiberG: meal.fiberG,
        sodiumMg: 240,
        ironMg: 1.8,
        allergens: meal.allergens || [],
        ingredients: meal.tags || [],
        image: meal.image,
        keywords: [
          meal.name.toLowerCase(),
          illnessId,
          'recovery',
          'jau',
          'soup',
          'broth',
          ...(meal.tags || []).map((t) => t.toLowerCase()),
        ],
      });
    });
  });

  // D. Index ANALYZER_PRESETS
  ANALYZER_PRESETS.forEach((p) => {
    if (seenNames.has(p.name.toLowerCase())) return;
    index.push({
      id: p.id,
      source: 'Scanner Preset',
      name: p.name,
      slot: (p.mealType || 'Lunch').toLowerCase(),
      mealType: p.mealType || 'Lunch',
      portion: p.portion,
      calories: p.calories,
      proteinG: p.proteinG,
      carbsG: p.carbsG,
      fatG: p.fatG,
      fiberG: p.fiberG,
      sodiumMg: p.sodiumMg || 380,
      ironMg: p.ironMg || 2.1,
      allergens: p.allergens || [],
      ingredients: p.ingredients || [],
      image: p.image,
      keywords: [p.name.toLowerCase(), ...(p.ingredients || []).map((i) => i.toLowerCase())],
    });
  });

  return index;
}

const KNOWLEDGE_INDEX = buildFoodKnowledgeIndex();

/**
 * 2. Retrieve Top Matching Foods for a User Query (Hybrid Token + Synonym Scoring)
 */
export function retrieveRelevantFoods(queryText, limit = 3) {
  const q = String(queryText || '').toLowerCase().trim();
  if (!q) return [];

  const tokens = q
    .replace(/[?.,!;:()]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const scored = KNOWLEDGE_INDEX.map((item) => {
    let score = 0;
    for (const kw of item.keywords) {
      if (q.includes(kw) && kw.length >= 3) {
        score += kw.length >= 6 ? 12 : 8;
      }
      for (const tok of tokens) {
        if (kw === tok) score += 6;
        else if (kw.includes(tok) && tok.length >= 3) score += 3;
      }
    }
    return { item, score };
  })
    .filter((entry) => entry.score >= 5)
    .sort((a, b) => b.score - a.score);

  // Deduplicate by item name
  const unique = [];
  const seen = new Set();
  for (const s of scored) {
    if (!seen.has(s.item.name)) {
      seen.add(s.item.name);
      unique.push(s.item);
      if (unique.length >= limit) break;
    }
  }
  return unique;
}

/**
 * 3. Compute Daily, Weekly (7-Day) & Monthly (30-Day) Analytics Reports
 */
export function computeProgressReport(state, periodDays = 1) {
  const todayISO = getTodayISO();
  const targets = state.nutritionTargets || {};
  const targetKcal = targets.targetCalories || 2200;
  const targetP = targets.proteinG || 150;
  const targetC = targets.carbsG || 220;
  const targetF = targets.fatG || 68;
  const targetFiber = targets.fiberG || 30;
  const hydration = state.hydration || { glasses: 0, goalGlasses: 8 };

  if (periodDays === 1) {
    const todayLogs = (state.foodLogs || []).filter((l) => l.dateISO === todayISO);
    const stats = summarizeDailyLogs(state.foodLogs, todayISO);
    const remainingKcal = Math.max(0, targetKcal - stats.calories);
    const overKcal = Math.max(0, stats.calories - targetKcal);
    const pct = Math.round((stats.calories / Math.max(1, targetKcal)) * 100);

    const mealLines = todayLogs.length
      ? todayLogs
          .map((m) => `• **${m.mealType}**: ${m.name} — ${m.calories} kcal (${m.proteinG}g P, ${m.carbsG}g C, ${m.fatG}g F)`)
          .join('\n')
      : '• আজ এখনো কোনো খাবার লগ করা হয়নি।';

    return {
      type: 'daily',
      stats,
      text:
        `📊 **Today's Daily Nutrition Report (${todayISO})**\n` +
        `• **Calories**: ${formatNumber(stats.calories)} / ${formatNumber(targetKcal)} kcal (${pct}%)${
          overKcal > 0 ? ` · ⚠️ ${formatNumber(overKcal)} kcal over target` : ` · **${formatNumber(remainingKcal)} kcal remaining**`
        }\n` +
        `• **Macros**: Protein **${stats.proteinG}g**/${targetP}g · Carbs **${stats.carbsG}g**/${targetC}g · Fat **${stats.fatG}g**/${targetF}g · Fiber **${stats.fiberG}g**/${targetFiber}g\n` +
        `• **Hydration**: 💧 ${hydration.glasses || 0}/${hydration.goalGlasses || 8} glasses of water\n` +
        `• **Logged Meals (${todayLogs.length})**:\n${mealLines}`,
    };
  }

  // 7-Day (Weekly) or 30-Day (Monthly) Report
  const daySummaries = [];
  let loggedDaysCount = 0;

  for (let i = periodDays - 1; i >= 0; i--) {
    const iso = getOffsetDateISO(i);
    const actual = summarizeDailyLogs(state.foodLogs, iso);
    let calories = actual.calories;
    let proteinG = actual.proteinG;
    let carbsG = actual.carbsG;
    let fatG = actual.fatG;
    let fiberG = actual.fiberG;

    if (actual.count > 0) {
      loggedDaysCount++;
    } else if (i > 0) {
      // Match My Foods deterministic baseline for historical days
      const wave = ((i * 7 + 3) % 11) - 5;
      calories = Math.max(1350, Math.round(targetKcal + wave * 42));
      proteinG = Math.round((calories * 0.3) / 4);
      carbsG = Math.round((calories * 0.42) / 4);
      fatG = Math.round((calories * 0.28) / 9);
      fiberG = Math.round((calories / 1000) * 14);
    }

    daySummaries.push({ iso, calories, proteinG, carbsG, fatG, fiberG, count: actual.count });
  }

  const totalKcal = daySummaries.reduce((s, d) => s + d.calories, 0);
  const avgKcal = Math.round(totalKcal / periodDays);
  const avgP = Math.round(daySummaries.reduce((s, d) => s + d.proteinG, 0) / periodDays);
  const avgC = Math.round(daySummaries.reduce((s, d) => s + d.carbsG, 0) / periodDays);
  const avgF = Math.round(daySummaries.reduce((s, d) => s + d.fatG, 0) / periodDays);

  const onTargetDays = daySummaries.filter(
    (d) => d.calories >= targetKcal * 0.85 && d.calories <= targetKcal * 1.15
  ).length;
  const adherencePct = Math.round((onTargetDays / periodDays) * 100);

  const sortedByKcal = [...daySummaries].sort((a, b) => b.calories - a.calories);
  const highestDay = sortedByKcal[0];
  const lowestDay = sortedByKcal[sortedByKcal.length - 1];

  const title = periodDays === 7 ? '📈 **Weekly (7-Day) Nutrition Report**' : '📅 **Monthly (30-Day) Nutrition Report**';

  return {
    type: periodDays === 7 ? 'weekly' : 'monthly',
    avgKcal,
    adherencePct,
    text:
      `${title}\n` +
      `• **Average Daily Intake**: **${formatNumber(avgKcal)} kcal/day** (Target: ${formatNumber(targetKcal)} kcal)\n` +
      `• **Average Macros**: Protein **${avgP}g** (Goal ${targetP}g) · Carbs **${avgC}g** · Fat **${avgF}g**\n` +
      `• **Target Adherence**: **${onTargetDays}/${periodDays} days (${adherencePct}%)** within ±15% of calorie goal\n` +
      `• **Peak vs Lowest**: Highest on ${highestDay.iso} (${formatNumber(highestDay.calories)} kcal) · Lowest on ${lowestDay.iso} (${formatNumber(lowestDay.calories)} kcal)\n` +
      `• **Recommendation**: ${
        avgP < targetP * 0.85
          ? `আপনার গড় প্রোটিন টার্গেটের চেয়ে কিছুটা কম (${avgP}g vs ${targetP}g)। দুপুর বা রাতের খাবারে মাছ, মুরগি, ডিম বা ডাল বাড়াতে পারেন।`
          : `আপনার ক্যালোরি এবং প্রোটিন ব্যালেন্স চমৎকার ট্র্যাকে আছে (${adherencePct}% adherence)!`
      }`,
  };
}

/**
 * 4. Evaluate Food Safety against User's Bangladesh Health Profile (Diabetes, Hypertension, PCOS, Anemia, Allergies)
 */
function buildHealthSuitabilityNote(food, state) {
  const conditions = state.profile?.healthConditions || [];
  const allergies = state.profile?.allergies || [];
  const notes = [];

  const conflicts = findAllergyConflicts(food.allergens, allergies);
  if (conflicts.length > 0) {
    notes.push(`⚠️ **Allergy Alert**: এতে **${conflicts.join(', ')}** রয়েছে যা আপনার অ্যালার্জি লিস্টে আছে!`);
  } else {
    notes.push(`✅ **Allergy Safe**: আপনার প্রোফাইলের কোনো অ্যালার্জেন এতে নেই।`);
  }

  if (conditions.includes('Diabetes / Blood Sugar') || conditions.includes('PCOS')) {
    if (food.carbsG >= 55) {
      notes.push(`🩸 **Diabetes/PCOS Note**: এতে কার্বোহাইড্রেট বেশি (${food.carbsG}g)। ব্লাড সুগার নিয়ন্ত্রণে রাখতে পোরশন ০.৫x–০.৭৫x করুন এবং সাথে সালাদ বা শাক যোগ করুন।`);
    } else {
      notes.push(`🩸 **Diabetes/PCOS Friendly**: কার্বোহাইড্রেট পরিমিত (${food.carbsG}g) এবং প্রোটিন/ফাইবার ব্যালেন্সড।`);
    }
  }

  if (conditions.includes('Hypertension')) {
    if ((food.sodiumMg || 0) >= 600) {
      notes.push(`🫀 **Hypertension Note**: এতে সোডিয়াম তুলনামূলক বেশি (~${food.sodiumMg}mg)। আপনার ডেইলি লিমিট ${state.nutritionTargets?.sodiumMg || 1500}mg, তাই অতিরিক্ত লবণ এড়িয়ে চলুন।`);
    } else {
      notes.push(`🫀 **Blood Pressure Friendly**: সোডিয়াম মাত্রা সহনীয় (~${food.sodiumMg || 350}mg)।`);
    }
  }

  if (conditions.includes('Anemia') && (food.ironMg || 0) >= 3.0) {
    notes.push(`🩸 **Anemia Support**: এটি আয়রনের ভালো উৎস (~${food.ironMg}mg Iron)।`);
  }

  return notes.join('\n');
}

/**
 * 5. Detect & Execute Agentic Intent (Swap Meal, Regenerate Day, Log Food, Set Illness Mode, Add Water, Reports)
 */
function parseDayFromQuery(q, fallbackDay) {
  const words = q.replace(/[?.,!]/g, ' ').split(/\s+/);
  for (const w of words) {
    if (DAY_ALIASES[w]) return DAY_ALIASES[w];
  }
  return fallbackDay;
}

function parseSlotFromQuery(q) {
  for (const [kw, slot] of Object.entries(SLOT_ALIASES)) {
    if (q.includes(kw)) return slot;
  }
  return null;
}

export async function processRagChatTurn(userMessage, store) {
  const state = store.getState();
  const q = String(userMessage || '').toLowerCase().trim();
  const activeDay = state.selectedPlannerDay || getCurrentDayShortName();

  // --- INTENT A: DAILY / WEEKLY / MONTHLY REPORTS ---
  if (
    q.includes('report') ||
    q.includes('summary') ||
    q.includes('analytics') ||
    q.includes('progress') ||
    q.includes('রিপোর্ট') ||
    q.includes('হিসাব') ||
    q.includes('আজকে কত') ||
    q.includes('remaining')
  ) {
    if (q.includes('month') || q.includes('30') || q.includes('মাস') || q.includes('৩০')) {
      store.setChartRangeDays(30);
      const rep = computeProgressReport(store.getState(), 30);
      return {
        text: rep.text,
        sources: ['30-Day Food Logs', 'Mifflin-St Jeor Targets'],
        actionBadge: 'Synced 30-Day Analytics',
      };
    }
    if (q.includes('week') || q.includes('7') || q.includes('সপ্তাহ') || q.includes('৭')) {
      store.setChartRangeDays(7);
      const rep = computeProgressReport(store.getState(), 7);
      return {
        text: rep.text,
        sources: ['7-Day Food Logs', 'Macro Adherence Engine'],
        actionBadge: 'Synced 7-Day Analytics',
      };
    }
    const rep = computeProgressReport(state, 1);
    return {
      text: rep.text,
      sources: ['Today Food Logs', 'Hydration Tracker'],
      actionBadge: 'Daily Report Generated',
    };
  }

  // --- INTENT B: MEAL SWAP OR DAY REGENERATION ---
  const isSwapIntent =
    q.includes('swap') ||
    q.includes('change') ||
    q.includes('replace') ||
    q.includes('বদলা') ||
    q.includes('চেঞ্জ') ||
    q.includes('পরিবর্তন');
  const isRegenIntent =
    q.includes('regenerate') ||
    q.includes('new plan') ||
    q.includes('refresh plan') ||
    q.includes('নতুন প্ল্যান');

  if (isSwapIntent || isRegenIntent) {
    const targetDay = parseDayFromQuery(q, activeDay);
    const targetSlot = parseSlotFromQuery(q);

    if (targetSlot && isSwapIntent) {
      const oldMeal = state.mealPlan?.days?.[targetDay]?.[targetSlot];
      if (targetDay !== state.selectedPlannerDay) {
        store.setSelectedPlannerDay(targetDay);
      }
      const nextMeal = store.swapMeal(targetDay, targetSlot);
      return {
        text:
          `🔄 **Meal Swapped Successfully (${targetDay} · ${targetSlot.toUpperCase()})**\n` +
          `• **Previous**: ${oldMeal?.name || 'Meal'} (${oldMeal?.calories || 0} kcal)\n` +
          `• **New Meal**: **${nextMeal.name}** — **${nextMeal.calories} kcal** (${nextMeal.proteinG}g P · ${nextMeal.carbsG}g C · ${nextMeal.fatG}g F)\n` +
          `• **Portion**: ${nextMeal.portion}\n` +
          `আপনার অ্যালার্জি ফিল্টার (${state.profile.allergies.join(', ') || 'None'}) বজায় রেখে মিল প্ল্যান আপডেট করা হয়েছে।`,
        sources: ['Adaptive Meal Planner', `MEAL_CATALOG.${targetSlot}`],
        actionBadge: `Swapped ${targetDay} ${targetSlot}`,
      };
    }

    // Regenerate whole day if no specific slot was mentioned
    await store.regenerateDay(targetDay);
    const updatedDayPlan = store.getState().mealPlan.days[targetDay];
    return {
      text:
        `✨ **Regenerated Full Day Meal Plan for ${targetDay}**\n` +
        `• **Breakfast**: ${updatedDayPlan.breakfast.name} (${updatedDayPlan.breakfast.calories} kcal)\n` +
        `• **Lunch**: ${updatedDayPlan.lunch.name} (${updatedDayPlan.lunch.calories} kcal)\n` +
        `• **Snack**: ${updatedDayPlan.snack.name} (${updatedDayPlan.snack.calories} kcal)\n` +
        `• **Dinner**: ${updatedDayPlan.dinner.name} (${updatedDayPlan.dinner.calories} kcal)`,
      sources: ['Adaptive Meal Planner', 'Allergy Filter Engine'],
      actionBadge: `Regenerated ${targetDay} Plan`,
    };
  }

  // --- INTENT C: LOG A FOOD DIRECTLY FROM CHAT ---
  const isLogIntent =
    q.startsWith('log ') ||
    q.includes('log ') ||
    q.includes('add to log') ||
    q.includes('i ate ') ||
    q.includes('খেয়েছি') ||
    q.includes('খেয়েছি') ||
    q.includes('লগ কর');

  if (isLogIntent) {
    const matches = retrieveRelevantFoods(q, 1);
    if (matches.length > 0) {
      const food = matches[0];
      const slotRaw = parseSlotFromQuery(q) || food.slot || 'lunch';
      const mealType = slotRaw.charAt(0).toUpperCase() + slotRaw.slice(1);
      const saved = await store.addFoodLog({
        name: food.name,
        mealType,
        calories: food.calories,
        proteinG: food.proteinG,
        carbsG: food.carbsG,
        fatG: food.fatG,
        fiberG: food.fiberG,
        portion: food.portion,
        image: food.image,
        allergens: food.allergens,
        source: 'AI Assistant',
      });
      const todayStats = summarizeDailyLogs(store.getState().foodLogs, getTodayISO());
      const rem = Math.max(0, store.getState().nutritionTargets.targetCalories - todayStats.calories);
      return {
        text:
          `✅ **Logged to My Foods (${mealType})**\n` +
          `• **Dish**: **${saved?.name || food.name}** (${food.portion})\n` +
          `• **Nutrition Added**: +**${food.calories} kcal** (${food.proteinG}g P · ${food.carbsG}g C · ${food.fatG}g F · ${food.fiberG}g Fiber)\n` +
          `• **Today's Total**: ${formatNumber(todayStats.calories)} / ${formatNumber(store.getState().nutritionTargets.targetCalories)} kcal (**${formatNumber(rem)} kcal remaining**)`,
        sources: [food.source, 'Food Log Database'],
        actionBadge: `Logged +${food.calories} kcal`,
      };
    }
  }

  // --- INTENT D: HYDRATION / WATER LOGGING ---
  if (
    (q.includes('water') || q.includes('glass') || q.includes('hydrate') || q.includes('পানি')) &&
    (q.includes('add') || q.includes('log') || q.includes('drank') || q.includes('+1') || q.includes('খেয়েছি') || q.includes('যোগ'))
  ) {
    const numMatch = q.match(/(\d+)/);
    const delta = numMatch ? Math.min(8, Math.max(1, Number(numMatch[1]))) : 1;
    store.addWaterGlass(delta);
    const hyd = store.getState().hydration;
    return {
      text: `💧 **Hydration Updated!** আপনার আজকের পানির ট্র্যাকারে **+${delta} গ্লাস** যোগ করা হয়েছে। বর্তমান স্ট্যাটাস: **${hyd.glasses}/${hyd.goalGlasses} glasses**।`,
      sources: ['Hydration Tracker'],
      actionBadge: `Water ${hyd.glasses}/${hyd.goalGlasses}`,
    };
  }

  // --- INTENT E: ILLNESS / RECOVERY MODE SWITCH OR ADVICE ---
  for (const rule of ILLNESS_KEYWORDS) {
    if (rule.words.some((w) => q.includes(w))) {
      const shouldActivate =
        q.includes('switch') ||
        q.includes('set') ||
        q.includes('adapt') ||
        q.includes('turn on') ||
        q.includes('have ') ||
        q.includes('feeling ') ||
        q.includes('হয়েছে') ||
        q.includes('লাগছে') ||
        q.includes('মোড');

      if (shouldActivate && state.profile.illnessMode !== rule.id) {
        await store.setIllnessMode(rule.id);
      }

      const info = ILLNESS_OPTIONS.find((i) => i.id === rule.id) || ILLNESS_OPTIONS[0];
      const recMeals = RECOVERY_MEALS[rule.id];

      if (recMeals) {
        return {
          text:
            `🩺 **${info.label} Recovery Nutrition Guide**${
              shouldActivate ? ' *(Meal Planner Auto-Synced)*' : ''
            }\n` +
            `${info.guidance}\n\n` +
            `• **Breakfast**: ${recMeals.breakfast.name} (${recMeals.breakfast.calories} kcal · ${recMeals.breakfast.tags.join(', ')})\n` +
            `• **Lunch**: ${recMeals.lunch.name} (${recMeals.lunch.calories} kcal · ${recMeals.lunch.tags.join(', ')})\n` +
            `• **Snack**: ${recMeals.snack.name} (${recMeals.snack.calories} kcal · ${recMeals.snack.tags.join(', ')})\n` +
            `• **Dinner**: ${recMeals.dinner.name} (${recMeals.dinner.calories} kcal · ${recMeals.dinner.tags.join(', ')})`,
          sources: [`RECOVERY_MEALS.${rule.id}`, 'Wellness Adaptation Engine'],
          actionBadge: shouldActivate ? `Activated ${info.label} Mode` : null,
        };
      }
    }
  }

  // --- INTENT F: SHOW CURRENT MEAL PLAN FOR A DAY ---
  if (
    q.includes('meal plan') ||
    q.includes('today menu') ||
    q.includes("today's menu") ||
    q.includes('what should i eat today') ||
    q.includes('আজকের মেনু') ||
    q.includes('মিল প্ল্যান')
  ) {
    const day = parseDayFromQuery(q, activeDay);
    const plan = state.mealPlan?.days?.[day] || {};
    const totalKcal =
      (plan.breakfast?.calories || 0) +
      (plan.lunch?.calories || 0) +
      (plan.snack?.calories || 0) +
      (plan.dinner?.calories || 0);

    return {
      text:
        `🍽️ **Your ${day} Meal Plan (${formatNumber(totalKcal)} kcal total · Mode: ${state.profile.illnessMode})**\n` +
        `• **Breakfast**: ${plan.breakfast?.name} — ${plan.breakfast?.calories} kcal (${plan.breakfast?.proteinG}g P)\n` +
        `• **Lunch**: ${plan.lunch?.name} — ${plan.lunch?.calories} kcal (${plan.lunch?.proteinG}g P)\n` +
        `• **Snack**: ${plan.snack?.name} — ${plan.snack?.calories} kcal (${plan.snack?.proteinG}g P)\n` +
        `• **Dinner**: ${plan.dinner?.name} — ${plan.dinner?.calories} kcal (${plan.dinner?.proteinG}g P)\n\n` +
        `💡 *Tip: যেকোনো বেলা বদলাতে লিখুন "Swap ${day} lunch" অথবা লগ করতে লিখুন "Log ${plan.lunch?.name}"।*`,
      sources: [`Weekly Meal Plan (${day})`],
      actionBadge: null,
    };
  }

  // --- INTENT G: RAG FOOD CALORIE & MACRO RETRIEVAL ---
  const matchedFoods = retrieveRelevantFoods(q, 3);
  if (matchedFoods.length > 0) {
    const primary = matchedFoods[0];
    const suitability = buildHealthSuitabilityNote(primary, state);
    const others =
      matchedFoods.length > 1
        ? `\n\n**Related Matches in Catalog:**\n` +
          matchedFoods
            .slice(1)
            .map(
              (f) =>
                `• **${f.name}** (${f.portion}): **${f.calories} kcal** · ${f.proteinG}g P · ${f.carbsG}g C · ${f.fatG}g F`
            )
            .join('\n')
        : '';

    return {
      text:
        `🍲 **${primary.name}**\n` +
        `• **Serving Portion**: ${primary.portion}\n` +
        `• **Calories**: **${primary.calories} kcal**\n` +
        `• **Macros**: Protein **${primary.proteinG}g** · Carbs **${primary.carbsG}g** · Fat **${primary.fatG}g** · Fiber **${primary.fiberG}g**\n` +
        `• **Micronutrients**: Sodium ~**${primary.sodiumMg}mg** · Iron ~**${primary.ironMg}mg**\n` +
        `• **Ingredients**: ${(primary.ingredients || []).join(', ') || 'Traditional preparation'}\n\n` +
        `${suitability}${others}\n\n` +
        `💡 *এই খাবারটি আজকের লগে যোগ করতে লিখুন: **"Log ${primary.name.split('(')[0].trim()}"***`,
      sources: [primary.source, 'Personal Health Profile'],
      actionBadge: null,
    };
  }

  // --- INTENT H: DIABETES, HYPERTENSION, PCOS, ANEMIA & MACRO GUIDANCE ---
  const targets = state.nutritionTargets;
  const bio = state.profile.biometrics;
  const todayStats = summarizeDailyLogs(state.foodLogs, getTodayISO());
  const remKcal = Math.max(0, targets.targetCalories - todayStats.calories);

  if (q.includes('diabetes') || q.includes('sugar') || q.includes('pcos') || q.includes('ডায়াবেটিস') || q.includes('সুগার')) {
    return {
      text:
        `🩸 **Diabetes & Blood Sugar Nutrition Guidance (Bangladesh Context)**\n` +
        `আপনার প্রোফাইল অনুযায়ী ডেইলি কার্বোহাইড্রেট টার্গেট **${targets.carbsG}g/day** এবং ফাইবার **${targets.fiberG}g/day**।\n` +
        `• **Smart Plate Rule**: সাদা ভাতের পোরশন কমিয়ে সাথে প্রচুর শাক (**লাল শাক/পালং শাক — ১৬৫ kcal, ৭g fiber**), **মসুর ডাল (২১০ kcal, ৬g fiber)** এবং মাছ বা মুরগি রাখুন।\n` +
        `• **Glycemic Control**: প্রতি বেলায় ৬–১০ গ্রাম ফাইবার ও ২৫–৪০ গ্রাম প্রোটিন রাখলে রক্তে গ্লুকোজ ধীরে শোষিত হয়।`,
      sources: ['Mifflin-St Jeor Condition Adjuster', 'YOLO_NUTRITION_DB'],
      actionBadge: null,
    };
  }

  if (q.includes('sodium') || q.includes('hypertension') || q.includes('pressure') || q.includes('প্রেশার') || q.includes('লবণ')) {
    return {
      text:
        `🫀 **Hypertension & Blood Pressure Guidance**\n` +
        `আপনার ডেইলি সোডিয়াম সিলিং **${formatNumber(targets.sodiumMg)} mg/day**।\n` +
        `• পাতে কাঁচা লবণ, অতিরিক্ত সয়া সস বা প্যাকেটজাত চানাচুর/ফাস্টফুড এড়িয়ে চলুন।\n` +
        `• আমাদের ক্যাটালগের **Steamed Rice, Rui Fish Curry (~460mg Na)** এবং **Lal Shak Bhaji (~310mg Na)** হাই প্রেশারের জন্য নিরাপদ।`,
      sources: ['Micronutrient Engine', 'DASH Sodium Guidelines'],
      actionBadge: null,
    };
  }

  if (q.includes('protein') || q.includes('muscle') || q.includes('fat loss') || q.includes('প্রোটিন') || q.includes('ওজন')) {
    return {
      text:
        `💪 **Personalized Protein & Goal Strategy (${GOAL_ADJUSTMENTS[bio.goal]?.label || 'Body Recomp'})**\n` +
        `• **Your Target**: **${targets.proteinG}g Protein/day** (~${formatNumber(targets.targetCalories)} kcal, BMR ${targets.bmr} kcal, TDEE ${targets.tdee} kcal)\n` +
        `• **Today's Progress**: **${todayStats.proteinG}g / ${targets.proteinG}g** logged so far (**${Math.max(0, targets.proteinG - todayStats.proteinG)}g remaining**)\n` +
        `• **Top High-Protein Desi Options**: Beef Kala Bhuna (43g P), Rui Fish Curry & Rice (42g P), Chicken Curry (38g P), Kacchi Biryani (38g P), Shahi Haleem (32g P).`,
      sources: ['Profile Biometrics', 'Food Catalog'],
      actionBadge: null,
    };
  }

  // --- OPTIONAL GEMINI API ENHANCEMENT (Zero Serverless Function Needed if VITE_GEMINI_API_KEY is set, or uses local grounded response) ---
  const geminiKey =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || '';

  if (geminiKey) {
    try {
      const systemContext =
        `You are NutriSense RAG AI Assistant for a user in Bangladesh. ` +
        `User: ${state.profile.name}, Age ${bio.age}, ${bio.weightKg}kg, ${bio.heightCm}cm, Goal: ${bio.goal}, ` +
        `Conditions: ${state.profile.healthConditions.join(', ') || 'None'}, Allergies: ${state.profile.allergies.join(', ') || 'None'}, ` +
        `Illness Mode: ${state.profile.illnessMode}. ` +
        `Targets: ${targets.targetCalories} kcal, ${targets.proteinG}g P, ${targets.carbsG}g C, ${targets.fatG}g F, ${targets.sodiumMg}mg Na. ` +
        `Today's Intake: ${todayStats.calories} kcal (${remKcal} kcal left), Water: ${state.hydration.glasses}/${state.hydration.goalGlasses} glasses. ` +
        `Answer concisely in the same language (English/Bengali/Banglish) using grounded NutriSense numbers.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${systemContext}\n\nUser Question: ${userMessage}` }] }],
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const llmText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (llmText) {
          return {
            text: llmText.trim(),
            sources: ['NutriSense RAG Context', 'Gemini 2.5 Flash'],
            actionBadge: null,
          };
        }
      }
    } catch {
      // Fall back seamlessly to local grounded RAG summary
    }
  }

  // --- DEFAULT GROUNDED RAG OVERVIEW ---
  const note = NUTRI_NOTES[state.nutriNoteIndex % NUTRI_NOTES.length];
  return {
    text:
      `👋 **NutriSense RAG Assistant (${state.profile.name})**\n` +
      `• **Today's Status**: **${formatNumber(todayStats.calories)} / ${formatNumber(targets.targetCalories)} kcal** (${formatNumber(remKcal)} kcal left) · Protein **${todayStats.proteinG}g/${targets.proteinG}g** · Water **${state.hydration.glasses}/${state.hydration.goalGlasses}** glasses\n` +
      `• **Active Filters**: Conditions: **${state.profile.healthConditions.join(', ') || 'None'}** · Allergies: **${state.profile.allergies.join(', ') || 'None'}** · Mode: **${state.profile.illnessMode}**\n\n` +
      `আপনি আমাকে নিচের যেকোনো প্রশ্ন বা কমান্ড দিতে পারেন:\n` +
      `1. **খাবারের ক্যালোরি জানতে**: *"কাচ্চি বিরিয়ানি বা সর্ষে ইলিশে কত ক্যালোরি?"*\n` +
      `2. **মিল সোয়াপ করতে**: *"Swap today's lunch"* বা *"Regenerate Monday"*\n` +
      `3. **খাবার বা পানি লগ করতে**: *"Log bhuna khichuri for lunch"* বা *"Add 1 glass water"*\n` +
      `4. **রিপোর্ট দেখতে**: *"Show my daily report"*, *"Weekly report"*, বা *"Monthly report"*\n\n` +
      `💡 *Nutri Note (${note.topic}): ${note.note}*`,
    sources: ['Live User Workspace', 'Food Catalog (70+ Dishes)'],
    actionBadge: null,
  };
}

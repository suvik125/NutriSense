import { store } from '../state/store.js';
import { renderProfileFormFieldsHTML } from '../components/profileForm.js';
import {
  calculateNutritionPlan,
  formatNumber,
  ftInToCm,
  lbToKg,
} from '../utils/nutrition.js';
import { renderBMIGauge, renderMacroDonutSVG } from '../utils/charts.js';
import { showToast } from '../components/toast.js';

let draftBio = null;
let draftConditions = null;
let draftAllergies = null;
let draftOwnerKey = null;

function buildOwnerKey(state) {
  return `${state.authUserId || 'guest'}:${state.isDemoMode ? 'demo' : 'pub'}:${state.nutritionTargets?.updatedAt || ''}`;
}

function ensureDraft(state) {
  const ownerKey = buildOwnerKey(state);
  if (!draftBio || draftOwnerKey !== ownerKey) {
    draftBio = { ...state.profile.biometrics };
    draftConditions = [...state.profile.healthConditions];
    draftAllergies = [...state.profile.allergies];
    draftOwnerKey = ownerKey;
  }
}

export function resetCalculatorDraft(state) {
  draftBio = { ...state.profile.biometrics };
  draftConditions = [...state.profile.healthConditions];
  draftAllergies = [...state.profile.allergies];
  draftOwnerKey = buildOwnerKey(state);
}

export function renderCalculatorView(state) {
  ensureDraft(state);
  const live = calculateNutritionPlan(draftBio, draftConditions);

  return `
    <div class="space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Mifflin-St Jeor Calculator</p>
          <h1 class="font-display text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white mt-1">
            Nutrition &amp; Macro Calculator
          </h1>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-2xl">
            Customize your biometrics, daily movement, goals, and sensitivities to calculate live calorie, macro, and micronutrient targets.
          </p>
        </div>
        <span class="text-xs text-zinc-500 dark:text-zinc-400">Approximate estimates · Educational use</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Left Form -->
        <form id="calculator-form" class="lg:col-span-7 rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 sm:p-7 space-y-6">
          ${renderProfileFormFieldsHTML({
            prefix: 'calc',
            draftBio,
            draftConditions,
            draftAllergies,
            resetAction: 'reset-calc',
          })}
        </form>

        <!-- Right Live Results Panel -->
        <div id="calculator-live-results" class="lg:col-span-5 space-y-5">
          <!-- Primary Targets Card -->
          <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Daily Target Calories</p>
                <p class="font-display text-4xl font-bold tabular-nums text-zinc-950 dark:text-[#B8F527] mt-1">
                  ${formatNumber(live.targetCalories)} <span class="text-base font-medium text-zinc-500 dark:text-zinc-400">kcal</span>
                </p>
              </div>
              <div class="text-right space-y-1">
                <p class="text-xs text-zinc-500 dark:text-zinc-400">BMR: <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${formatNumber(live.bmr)} kcal</span></p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">TDEE: <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${formatNumber(live.tdee)} kcal</span></p>
              </div>
            </div>

            <div class="pt-4 border-t border-zinc-200 dark:border-[#23262E]">
              ${renderBMIGauge({ bmi: live.bmi, category: live.bmiCategory, gaugePercent: live.bmiGaugePercent })}
            </div>
          </div>

          <!-- Macro Donut Card -->
          <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Macro Targets</h2>
              <span class="text-xs font-mono-num text-zinc-500 dark:text-zinc-400">Fiber ${live.fiberG}g/day</span>
            </div>
            ${renderMacroDonutSVG({ proteinG: live.proteinG, carbsG: live.carbsG, fatG: live.fatG })}
          </div>

          <!-- Micronutrient Targets Card -->
          <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4">
            <h2 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Key Micronutrient Targets</h2>
            <div class="grid grid-cols-2 gap-3">
              ${renderMicroTile('Iron', `${live.ironMg} mg`, draftConditions.includes('Anemia') ? 'Adjusted for anemia support' : 'Daily reference')}
              ${renderMicroTile('Calcium', `${formatNumber(live.calciumMg)} mg`, 'Bone & muscle function')}
              ${renderMicroTile('Vitamin D', `${live.vitaminDMcg} mcg`, `${live.vitaminDMcg * 40} IU equivalent`)}
              ${renderMicroTile('Sodium Cap', `${formatNumber(live.sodiumMg)} mg`, draftConditions.includes('Hypertension') ? 'DASH-aligned cap' : 'Standard ceiling')}
            </div>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Calculations use Mifflin-St Jeor equations and standard dietary reference intakes as approximate informational targets, not clinical prescriptions.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMicroTile(name, value, note) {
  return `
    <div class="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#1A1C22] border border-zinc-200/70 dark:border-[#262932]">
      <p class="text-xs text-zinc-500 dark:text-zinc-400">${name}</p>
      <p class="font-mono-num text-lg font-bold text-zinc-950 dark:text-white mt-0.5">${value}</p>
      <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">${note}</p>
    </div>
  `;
}

export function bindCalculatorViewEvents(root, rerender) {
  const ageInput = root.querySelector('#calc-age');
  ageInput?.addEventListener('input', () => {
    draftBio.age = Math.max(13, Math.min(100, Number(ageInput.value) || 28));
    updateResultsOnly(root);
  });

  root.querySelectorAll('[data-calc-gender]').forEach((btn) =>
    btn.addEventListener('click', () => {
      draftBio.gender = btn.getAttribute('data-calc-gender');
      rerender();
    })
  );

  root.querySelectorAll('[data-calc-height-unit]').forEach((btn) =>
    btn.addEventListener('click', () => {
      draftBio.heightUnit = btn.getAttribute('data-calc-height-unit');
      rerender();
    })
  );

  root.querySelectorAll('[data-calc-weight-unit]').forEach((btn) =>
    btn.addEventListener('click', () => {
      draftBio.weightUnit = btn.getAttribute('data-calc-weight-unit');
      rerender();
    })
  );

  root.querySelector('#calc-height-cm')?.addEventListener('input', (e) => {
    draftBio.heightCm = Math.max(100, Math.min(240, Number(e.target.value) || 170));
    updateResultsOnly(root);
  });

  const syncFtIn = () => {
    const ft = Number(root.querySelector('#calc-height-ft')?.value) || 5;
    const inch = Number(root.querySelector('#calc-height-in')?.value) || 0;
    draftBio.heightCm = ftInToCm(ft, inch);
    updateResultsOnly(root);
  };
  root.querySelector('#calc-height-ft')?.addEventListener('input', syncFtIn);
  root.querySelector('#calc-height-in')?.addEventListener('input', syncFtIn);

  root.querySelector('#calc-weight')?.addEventListener('input', (e) => {
    const val = Number(e.target.value) || 70;
    draftBio.weightKg = draftBio.weightUnit === 'kg' ? val : lbToKg(val);
    updateResultsOnly(root);
  });

  root.querySelector('#calc-job')?.addEventListener('change', (e) => {
    draftBio.jobType = e.target.value;
    updateResultsOnly(root);
  });

  root.querySelector('#calc-activity')?.addEventListener('change', (e) => {
    draftBio.activityLevel = e.target.value;
    updateResultsOnly(root);
  });

  root.querySelectorAll('[data-calc-goal]').forEach((btn) =>
    btn.addEventListener('click', () => {
      draftBio.goal = btn.getAttribute('data-calc-goal');
      rerender();
    })
  );

  root.querySelectorAll('[data-calc-condition]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const cond = btn.getAttribute('data-calc-condition');
      if (draftConditions.includes(cond)) {
        draftConditions = draftConditions.filter((c) => c !== cond);
      } else {
        draftConditions = [...draftConditions, cond];
      }
      rerender();
    })
  );

  root.querySelectorAll('[data-calc-allergy]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const alg = btn.getAttribute('data-calc-allergy');
      if (draftAllergies.includes(alg)) {
        draftAllergies = draftAllergies.filter((a) => a !== alg);
      } else {
        draftAllergies = [...draftAllergies, alg];
      }
      rerender();
    })
  );

  root.querySelector('[data-action="reset-calc"]')?.addEventListener('click', () => {
    resetCalculatorDraft(store.getState());
    rerender();
    showToast('Reset calculator to saved profile');
  });

  root.querySelector('#calculator-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    store.saveProfileAndTargets({
      biometrics: draftBio,
      healthConditions: draftConditions,
      allergies: draftAllergies,
    });
    showToast('Saved targets to your profile & synced meal plan');
  });
}

function updateResultsOnly(root) {
  const container = root.querySelector('#calculator-live-results');
  if (!container) return;
  const live = calculateNutritionPlan(draftBio, draftConditions);
  container.innerHTML = `
    <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Daily Target Calories</p>
          <p class="font-display text-4xl font-bold tabular-nums text-zinc-950 dark:text-[#B8F527] mt-1">
            ${formatNumber(live.targetCalories)} <span class="text-base font-medium text-zinc-500 dark:text-zinc-400">kcal</span>
          </p>
        </div>
        <div class="text-right space-y-1">
          <p class="text-xs text-zinc-500 dark:text-zinc-400">BMR: <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${formatNumber(live.bmr)} kcal</span></p>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">TDEE: <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${formatNumber(live.tdee)} kcal</span></p>
        </div>
      </div>

      <div class="pt-4 border-t border-zinc-200 dark:border-[#23262E]">
        ${renderBMIGauge({ bmi: live.bmi, category: live.bmiCategory, gaugePercent: live.bmiGaugePercent })}
      </div>
    </div>

    <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Macro Targets</h2>
        <span class="text-xs font-mono-num text-zinc-500 dark:text-zinc-400">Fiber ${live.fiberG}g/day</span>
      </div>
      ${renderMacroDonutSVG({ proteinG: live.proteinG, carbsG: live.carbsG, fatG: live.fatG })}
    </div>

    <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4">
      <h2 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Key Micronutrient Targets</h2>
      <div class="grid grid-cols-2 gap-3">
        ${renderMicroTile('Iron', `${live.ironMg} mg`, draftConditions.includes('Anemia') ? 'Adjusted for anemia support' : 'Daily reference')}
        ${renderMicroTile('Calcium', `${formatNumber(live.calciumMg)} mg`, 'Bone & muscle function')}
        ${renderMicroTile('Vitamin D', `${live.vitaminDMcg} mcg`, `${live.vitaminDMcg * 40} IU equivalent`)}
        ${renderMicroTile('Sodium Cap', `${formatNumber(live.sodiumMg)} mg`, draftConditions.includes('Hypertension') ? 'DASH-aligned cap' : 'Standard ceiling')}
      </div>
      <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
        Calculations use Mifflin-St Jeor equations and standard dietary reference intakes as approximate informational targets, not clinical prescriptions.
      </p>
    </div>
  `;
}

import { icon } from './icons.js';
import { ALLERGY_OPTIONS, HEALTH_CONDITIONS } from '../data/catalog.js';
import { cmToFtIn, kgToLb } from '../utils/nutrition.js';

export function renderProfileFormFieldsHTML({
  prefix = 'calc',
  draftBio,
  draftConditions = [],
  draftAllergies = [],
  resetAction = 'reset-calc',
  isSaving = false,
}) {
  const { feet, inches } = cmToFtIn(draftBio.heightCm);
  const weightLb = kgToLb(draftBio.weightKg);

  return `
    <!-- Age & Gender -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label for="${prefix}-age" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Age (years)</label>
        <input
          id="${prefix}-age"
          type="number"
          min="13"
          max="100"
          value="${draftBio.age}"
          class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm font-mono-num text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
        />
      </div>

      <div>
        <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Sex / Physiology</span>
        <div class="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-[#1B1D23]">
          ${['male', 'female', 'other']
            .map(
              (g) => `
            <button
              type="button"
              data-${prefix}-gender="${g}"
              class="py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                draftBio.gender === g
                  ? 'bg-[#B8F527] text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }"
            >${g}</button>
          `
            )
            .join('')}
        </div>
      </div>
    </div>

    <!-- Height & Weight with Unit Toggles -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300" for="${
            draftBio.heightUnit === 'cm' ? `${prefix}-height-cm` : `${prefix}-height-ft`
          }">Height</label>
          <div class="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-[#1B1D23]">
            <button type="button" data-${prefix}-height-unit="cm" class="px-2.5 py-1 text-[11px] font-semibold rounded-md ${
              draftBio.heightUnit === 'cm'
                ? 'bg-[#B8F527] text-zinc-950'
                : 'text-zinc-500 dark:text-zinc-400'
            }">cm</button>
            <button type="button" data-${prefix}-height-unit="ft" class="px-2.5 py-1 text-[11px] font-semibold rounded-md ${
              draftBio.heightUnit === 'ft'
                ? 'bg-[#B8F527] text-zinc-950'
                : 'text-zinc-500 dark:text-zinc-400'
            }">ft / in</button>
          </div>
        </div>

        ${
          draftBio.heightUnit === 'cm'
            ? `<input
                id="${prefix}-height-cm"
                type="number"
                min="110"
                max="230"
                step="0.5"
                value="${draftBio.heightCm}"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm font-mono-num text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
              />`
            : `<div class="grid grid-cols-2 gap-2">
                <div class="relative">
                  <input
                    id="${prefix}-height-ft"
                    type="number"
                    min="3"
                    max="7"
                    value="${feet}"
                    aria-label="Height feet"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm font-mono-num text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
                  />
                  <span class="absolute right-3 top-2.5 text-xs text-zinc-400">ft</span>
                </div>
                <div class="relative">
                  <input
                    id="${prefix}-height-in"
                    type="number"
                    min="0"
                    max="11"
                    value="${inches}"
                    aria-label="Height inches"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm font-mono-num text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
                  />
                  <span class="absolute right-3 top-2.5 text-xs text-zinc-400">in</span>
                </div>
              </div>`
        }
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300" for="${prefix}-weight">Weight</label>
          <div class="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-[#1B1D23]">
            <button type="button" data-${prefix}-weight-unit="kg" class="px-2.5 py-1 text-[11px] font-semibold rounded-md ${
              draftBio.weightUnit === 'kg'
                ? 'bg-[#B8F527] text-zinc-950'
                : 'text-zinc-500 dark:text-zinc-400'
            }">kg</button>
            <button type="button" data-${prefix}-weight-unit="lb" class="px-2.5 py-1 text-[11px] font-semibold rounded-md ${
              draftBio.weightUnit === 'lb'
                ? 'bg-[#B8F527] text-zinc-950'
                : 'text-zinc-500 dark:text-zinc-400'
            }">lb</button>
          </div>
        </div>
        <div class="relative">
          <input
            id="${prefix}-weight"
            type="number"
            min="${draftBio.weightUnit === 'kg' ? '30' : '66'}"
            max="${draftBio.weightUnit === 'kg' ? '250' : '550'}"
            step="0.5"
            value="${draftBio.weightUnit === 'kg' ? draftBio.weightKg : weightLb}"
            class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm font-mono-num text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
          />
          <span class="absolute right-3.5 top-2.5 text-xs text-zinc-400">${draftBio.weightUnit}</span>
        </div>
      </div>
    </div>

    <!-- Job Type & Activity Level -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label for="${prefix}-job" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Daily Job Type</label>
        <select
          id="${prefix}-job"
          class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
        >
          <option value="desk" ${draftBio.jobType === 'desk' ? 'selected' : ''}>Desk / Sedentary Work</option>
          <option value="light_active" ${draftBio.jobType === 'light_active' ? 'selected' : ''}>Light Active (Teacher, Retail)</option>
          <option value="standing" ${draftBio.jobType === 'standing' ? 'selected' : ''}>Standing / Walking (Nurse, Chef)</option>
          <option value="physical" ${draftBio.jobType === 'physical' ? 'selected' : ''}>Physical Labor / Trade</option>
        </select>
      </div>

      <div>
        <label for="${prefix}-activity" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Exercise Level</label>
        <select
          id="${prefix}-activity"
          class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
        >
          <option value="sedentary" ${draftBio.activityLevel === 'sedentary' ? 'selected' : ''}>Sedentary (Little exercise)</option>
          <option value="light" ${draftBio.activityLevel === 'light' ? 'selected' : ''}>Light (1–2 workouts/wk)</option>
          <option value="moderate" ${draftBio.activityLevel === 'moderate' ? 'selected' : ''}>Moderate (3–5 workouts/wk)</option>
          <option value="very" ${draftBio.activityLevel === 'very' ? 'selected' : ''}>Very Active (6–7 workouts/wk)</option>
          <option value="athlete" ${draftBio.activityLevel === 'athlete' ? 'selected' : ''}>Athlete (2x daily training)</option>
        </select>
      </div>
    </div>

    <!-- Fitness Goal -->
    <div>
      <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Fitness Goal</span>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        ${[
          { id: 'lose', label: 'Fat Loss' },
          { id: 'maintain', label: 'Maintain' },
          { id: 'recomp', label: 'Body Recomp' },
          { id: 'gain', label: 'Lean Gain' },
        ]
          .map(
            (g) => `
          <button
            type="button"
            data-${prefix}-goal="${g.id}"
            class="py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
              draftBio.goal === g.id
                ? 'bg-[#B8F527] text-zinc-950 border-[#B8F527]'
                : 'bg-zinc-50 dark:bg-[#1B1D23] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-[#2B2E36] hover:border-zinc-400'
            }"
          >${g.label}</button>
        `
          )
          .join('')}
      </div>
    </div>

    <!-- Health Conditions -->
    <div>
      <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Health Considerations (optional)</span>
      <div class="flex flex-wrap gap-2">
        ${HEALTH_CONDITIONS.map((cond) => {
          const active = draftConditions.includes(cond);
          return `
            <button
              type="button"
              data-${prefix}-condition="${cond}"
              aria-pressed="${active}"
              class="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                active
                  ? 'bg-zinc-950 text-[#B8F527] border-[#B8F527] dark:bg-[#B8F527]/15 dark:text-[#B8F527]'
                  : 'bg-zinc-50 dark:bg-[#1B1D23] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-[#2B2E36]'
              }"
            >${cond}</button>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Allergies -->
    <div>
      <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Allergies &amp; Exclusions</span>
      <div class="flex flex-wrap gap-2">
        ${ALLERGY_OPTIONS.map((alg) => {
          const active = draftAllergies.includes(alg);
          return `
            <button
              type="button"
              data-${prefix}-allergy="${alg}"
              aria-pressed="${active}"
              class="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                active
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/60'
                  : 'bg-zinc-50 dark:bg-[#1B1D23] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-[#2B2E36]'
              }"
            >${alg}</button>
          `;
        }).join('')}
      </div>
    </div>

    <div class="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 dark:border-[#23262E]">
      <button
        type="button"
        data-action="${resetAction}"
        class="px-4 py-2.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
      >Reset to Saved Profile</button>
      <button
        type="submit"
        ${isSaving ? 'disabled' : ''}
        class="px-6 py-3 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] disabled:opacity-60 text-zinc-950 text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-sm"
      >
        ${icon('check', 'w-4 h-4')}
        <span>${isSaving ? 'Saving Profile...' : 'Save to Profile'}</span>
      </button>
    </div>
  `;
}

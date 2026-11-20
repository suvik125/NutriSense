import {
  ALLERGY_OPTIONS,
  ANALYZER_PRESETS,
  HEALTH_CONDITIONS,
  ILLNESS_OPTIONS,
  MEAL_CATALOG,
  RECOVERY_MEALS,
} from '../data/catalog.js';
import { DOCS_NAV_ITEMS } from '../data/docsDefaults.js';
import {
  getDocsAccessConfig,
  getDocsContent,
  isDocsAdminUnlocked,
  lockDocsAdmin,
  resetDocsContent,
  saveDocsAccessConfig,
  saveDocsContent,
  verifyDocsAdminPasscode,
} from '../services/docsStore.js';
import {
  computeDocsLiveMetrics,
  evaluateDocsAccess,
  exportDocsToMarkdown,
  filterDocsNavItems,
} from '../utils/docsAccess.js';
import { deriveInitials } from '../utils/dbMappers.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { store } from '../state/store.js';

let docsUiState = {
  searchQuery: '',
  sectionFilter: 'all', // 'all' | 'pitch' | 'tech'
  adminModeActive: false,
  unlockPromptOpen: false,
  unlockError: '',
  adminTab: 'access', // 'access' | 'content' | 'team'
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toDatetimeLocalValue(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function renderTeamAvatar(member) {
  const initials = deriveInitials(member.name, 'DC');
  if (member.photoUrl) {
    return `
      <div class="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-zinc-100 dark:bg-[#1C1F26] border border-zinc-200 dark:border-[#2A2E38]">
        <img
          src="${esc(member.photoUrl)}"
          alt="${esc(member.name)}"
          referrerpolicy="no-referrer"
          class="w-full h-full object-cover"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
        />
        <div style="display:none;" class="absolute inset-0 items-center justify-center bg-[#B8F527]/15 text-zinc-900 dark:text-[#B8F527] font-display text-lg font-bold">
          ${esc(initials)}
        </div>
      </div>
    `;
  }
  return `
    <div class="w-16 h-16 rounded-2xl shrink-0 bg-[#B8F527]/15 border border-[#B8F527]/35 text-zinc-950 dark:text-[#B8F527] font-display text-lg font-bold flex items-center justify-center select-none">
      ${esc(initials)}
    </div>
  `;
}

function renderArchitectureDiagramSVG() {
  return `
    <div class="overflow-x-auto pb-2">
      <svg viewBox="0 0 880 310" class="w-full min-w-[680px] h-auto" role="img" aria-label="NutriSense System Architecture Diagram">
        <defs>
          <marker id="arch-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#84CC16" />
          </marker>
        </defs>

        <!-- Client Layer -->
        <rect x="20" y="65" width="210" height="175" rx="16" class="fill-zinc-50 dark:fill-[#181B21] stroke-zinc-300 dark:stroke-[#2D323E]" stroke-width="1.5" />
        <text x="38" y="96" class="fill-[#658C0A] dark:fill-[#B8F527] text-[11px] font-semibold">CLIENT INTERFACE</text>
        <text x="38" y="122" class="fill-zinc-950 dark:fill-white text-[15px] font-bold">User Browser</text>
        <text x="38" y="146" class="fill-zinc-600 dark:fill-zinc-400 text-[12px]">Vanilla JS ES6+ &amp; Vite</text>
        <text x="38" y="166" class="fill-zinc-600 dark:fill-zinc-400 text-[12px]">Tailwind CSS v4 (Dark/Light)</text>
        <text x="38" y="186" class="fill-zinc-600 dark:fill-zinc-400 text-[12px]">Reactive NutriStore &amp; Charts</text>
        <text x="38" y="210" class="fill-zinc-500 dark:fill-zinc-500 text-[11px] font-mono">LocalStorage Docs + Prefs</text>

        <!-- Arrows from Browser to Supabase & Gemini -->
        <line x1="230" y1="115" x2="322" y2="90" stroke="#84CC16" stroke-width="2" marker-end="url(#arch-arrow)" />
        <line x1="230" y1="190" x2="322" y2="215" stroke="#84CC16" stroke-width="2" marker-end="url(#arch-arrow)" />

        <!-- Supabase Box -->
        <rect x="330" y="24" width="265" height="122" rx="16" class="fill-zinc-50 dark:fill-[#181B21] stroke-zinc-300 dark:stroke-[#2D323E]" stroke-width="1.5" />
        <text x="348" y="52" class="fill-[#658C0A] dark:fill-[#B8F527] text-[11px] font-semibold">PERSISTENCE &amp; AUTH</text>
        <text x="348" y="76" class="fill-zinc-950 dark:fill-white text-[15px] font-bold">Supabase Auth &amp; Postgres</text>
        <text x="348" y="98" class="fill-zinc-600 dark:fill-zinc-400 text-[12px]">9 Tables · Row-Level Security (RLS)</text>
        <text x="348" y="118" class="fill-zinc-600 dark:fill-zinc-400 text-[12px]">Profiles, Targets, Meal Plans, Logs</text>

        <!-- Gemini AI Box -->
        <rect x="330" y="164" width="265" height="122" rx="16" class="fill-zinc-50 dark:fill-[#181B21] stroke-zinc-300 dark:stroke-[#2D323E]" stroke-width="1.5" />
        <text x="348" y="192" class="fill-[#658C0A] dark:fill-[#B8F527] text-[11px] font-semibold">INTELLIGENCE LAYER</text>
        <text x="348" y="216" class="fill-zinc-950 dark:fill-white text-[15px] font-bold">Google Gemini AI API</text>
        <text x="348" y="238" class="fill-zinc-600 dark:fill-zinc-400 text-[12px]">Context: Calories, Protein, Illness Mode</text>
        <text x="348" y="258" class="fill-zinc-600 dark:fill-zinc-400 text-[12px]">Fallback: generateAssistantReply()</text>

        <!-- Arrows to Edge Hosting -->
        <line x1="595" y1="88" x2="672" y2="128" stroke="#84CC16" stroke-width="2" marker-end="url(#arch-arrow)" />
        <line x1="595" y1="220" x2="672" y2="178" stroke="#84CC16" stroke-width="2" marker-end="url(#arch-arrow)" />

        <!-- Vercel Edge Box -->
        <rect x="680" y="65" width="180" height="175" rx="16" class="fill-zinc-50 dark:fill-[#181B21] stroke-zinc-300 dark:stroke-[#2D323E]" stroke-width="1.5" />
        <text x="698" y="96" class="fill-[#658C0A] dark:fill-[#B8F527] text-[11px] font-semibold">DELIVERY &amp; CI/CD</text>
        <text x="698" y="122" class="fill-zinc-950 dark:fill-white text-[15px] font-bold">Vercel Edge</text>
        <text x="698" y="146" class="fill-zinc-600 dark:fill-zinc-400 text-[12px]">GitHub Auto-Deploy</text>
        <text x="698" y="166" class="fill-zinc-600 dark:fill-zinc-400 text-[12px]">SPA Routing (/docs)</text>
        <text x="698" y="186" class="fill-zinc-600 dark:fill-zinc-400 text-[12px]">Static CDN Assets</text>
      </svg>
    </div>
  `;
}

function renderDataFlowDiagramSVG() {
  const steps = [
    { step: '01', title: 'Biometrics Input', sub: 'One-Time Setup / Calc' },
    { step: '02', title: 'Nutrition Engine', sub: 'Mifflin-St Jeor + BMI' },
    { step: '03', title: 'Supabase Sync', sub: 'Health & Targets RLS' },
    { step: '04', title: 'Plan & AI Context', sub: '7-Day BD Meals + Gemini' },
    { step: '05', title: 'User Feedback', sub: 'Logs, Reminders, Rings' },
  ];

  return `
    <div class="overflow-x-auto pb-2">
      <svg viewBox="0 0 880 140" class="w-full min-w-[680px] h-auto" role="img" aria-label="NutriSense Data Flow Diagram">
        <defs>
          <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#84CC16" />
          </marker>
        </defs>
        ${steps
          .map((item, idx) => {
            const x = 14 + idx * 174;
            const arrow =
              idx < steps.length - 1
                ? `<line x1="${x + 152}" y1="70" x2="${x + 168}" y2="70" stroke="#84CC16" stroke-width="2" marker-end="url(#flow-arrow)" />`
                : '';
            return `
              <rect x="${x}" y="22" width="150" height="96" rx="14" class="fill-zinc-50 dark:fill-[#181B21] stroke-zinc-300 dark:stroke-[#2D323E]" stroke-width="1.5" />
              <text x="${x + 14}" y="46" class="fill-[#658C0A] dark:fill-[#B8F527] text-[11px] font-mono font-bold">${item.step}</text>
              <text x="${x + 14}" y="70" class="fill-zinc-950 dark:fill-white text-[13px] font-bold">${item.title}</text>
              <text x="${x + 14}" y="92" class="fill-zinc-600 dark:fill-zinc-400 text-[11px]">${item.sub}</text>
              ${arrow}
            `;
          })
          .join('')}
      </svg>
    </div>
  `;
}

function renderAdminUnlockPrompt() {
  if (!docsUiState.unlockPromptOpen) return '';
  return `
    <div class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 sm:p-6 max-w-md mx-auto my-6 space-y-4 shadow-lg">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Administrator Verification</h3>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Enter your DIU_Coderunners admin passcode to manage publishing windows, pitch slides, and team profiles.
          </p>
        </div>
        <button
          type="button"
          data-docs-action="close-admin-unlock"
          aria-label="Close admin verification"
          class="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-[#1E2127] text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
        >
          ${icon('x', 'w-4 h-4')}
        </button>
      </div>
      <form id="docs-admin-unlock-form" class="space-y-3">
        <div>
          <label for="docs-admin-passcode" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Admin Passcode</label>
          <input
            id="docs-admin-passcode"
            type="password"
            required
            placeholder="Enter passcode"
            class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
          />
        </div>
        ${
          docsUiState.unlockError
            ? `<p class="text-xs font-medium text-red-500" role="alert">${esc(docsUiState.unlockError)}</p>`
            : ''
        }
        <div class="flex justify-end gap-2">
          <button
            type="submit"
            class="px-4 py-2 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-xs font-semibold transition-colors"
          >
            Unlock Editor
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderAdminEditorPanel(content, accessConfig, accessResult) {
  if (!isDocsAdminUnlocked() || !docsUiState.adminModeActive) return '';
  const tab = docsUiState.adminTab;

  return `
    <section id="docs-admin-panel" class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 sm:p-7 space-y-6 print:hidden">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-[#24272F] pb-4">
        <div>
          <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Admin Console · Local Persistence Active</p>
          <h2 class="font-display text-xl font-bold text-zinc-950 dark:text-white mt-0.5">
            Documentation Access, Scheduling &amp; Content Editor
          </h2>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-docs-action="reset-defaults"
            class="px-3.5 py-2 rounded-full border border-zinc-200 dark:border-[#2B2E36] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-red-400 hover:text-red-500 transition-colors"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            data-docs-action="lock-admin"
            class="px-3.5 py-2 rounded-full bg-zinc-900 dark:bg-[#1F232B] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Lock Admin
          </button>
        </div>
      </div>

      <!-- Admin Sub-tabs -->
      <div class="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#1B1D23] w-fit">
        ${[
          { id: 'access', label: 'Visibility & Schedule' },
          { id: 'content', label: 'Pitch & Technical Copy' },
          { id: 'team', label: 'Team Roster' },
        ]
          .map(
            (t) => `
          <button
            type="button"
            data-docs-admin-tab="${t.id}"
            class="px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              tab === t.id
                ? 'bg-[#B8F527] text-zinc-950'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }"
          >${t.label}</button>
        `
          )
          .join('')}
      </div>

      ${
        tab === 'access'
          ? `
        <form id="docs-access-form" class="space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 rounded-2xl bg-zinc-50 dark:bg-[#191C22] border border-zinc-200/80 dark:border-[#282C35] flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-semibold text-zinc-950 dark:text-white">Public /docs Visibility</p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  ${accessConfig.visibilityEnabled ? 'ON — Public judges can view /docs' : 'OFF — Returns 403 Unavailable'}
                </p>
              </div>
              <label class="inline-flex items-center cursor-pointer shrink-0">
                <input
                  id="docs-visibility-toggle"
                  type="checkbox"
                  class="sr-only peer"
                  ${accessConfig.visibilityEnabled ? 'checked' : ''}
                />
                <span class="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 rounded-full peer peer-checked:bg-[#B8F527] relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white peer-checked:after:translate-x-5 after:transition-transform"></span>
              </label>
            </div>

            <div class="p-4 rounded-2xl bg-zinc-50 dark:bg-[#191C22] border border-zinc-200/80 dark:border-[#282C35]">
              <label for="docs-schedule-mode" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Publishing Schedule Mode</label>
              <select
                id="docs-schedule-mode"
                class="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
              >
                <option value="always" ${accessConfig.scheduleMode === 'always' ? 'selected' : ''}>Always Available (Default)</option>
                <option value="scheduled" ${accessConfig.scheduleMode === 'scheduled' ? 'selected' : ''}>Scheduled Start &amp; End Window</option>
                <option value="duration" ${accessConfig.scheduleMode === 'duration' ? 'selected' : ''}>Duration-Based Showcase Window</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="docs-start-at" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Start Date &amp; Time</label>
              <input
                id="docs-start-at"
                type="datetime-local"
                value="${esc(toDatetimeLocalValue(accessConfig.startAt))}"
                class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-950 dark:text-white font-mono-num focus:outline-none focus:border-[#B8F527]"
              />
            </div>
            <div>
              <label for="docs-end-at" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">End Date &amp; Time</label>
              <input
                id="docs-end-at"
                type="datetime-local"
                value="${esc(toDatetimeLocalValue(accessConfig.endAt))}"
                class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-950 dark:text-white font-mono-num focus:outline-none focus:border-[#B8F527]"
              />
            </div>
            <div>
              <label for="docs-duration-hours" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Duration (hours)</label>
              <input
                id="docs-duration-hours"
                type="number"
                min="1"
                max="8760"
                value="${Number(accessConfig.durationHours) || 72}"
                class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-950 dark:text-white font-mono-num focus:outline-none focus:border-[#B8F527]"
              />
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-[#24272F]">
            <p class="text-xs text-zinc-600 dark:text-zinc-400">
              Current Evaluation: <strong class="text-zinc-950 dark:text-white">${accessResult.allowed ? '200 Public' : '403 Blocked'}</strong> · ${esc(accessResult.summaryText)}
            </p>
            <button
              type="submit"
              class="px-5 py-2.5 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-xs font-semibold transition-colors"
            >
              Save Access Schedule
            </button>
          </div>
        </form>
      `
          : ''
      }

      ${
        tab === 'content'
          ? `
        <form id="docs-content-form" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="docs-edit-tagline" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Product Tagline</label>
              <input
                id="docs-edit-tagline"
                type="text"
                value="${esc(content.meta.tagline)}"
                class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-950 dark:text-white"
              />
            </div>
            <div>
              <label for="docs-edit-version" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Release Version Label</label>
              <input
                id="docs-edit-version"
                type="text"
                value="${esc(content.meta.version)}"
                class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-950 dark:text-white"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="docs-edit-problem" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Pitch 01 · Problem Narrative</label>
              <textarea id="docs-edit-problem" rows="3" class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-950 dark:text-white">${esc(content.pitch.slides[0]?.body || '')}</textarea>
            </div>
            <div>
              <label for="docs-edit-solution" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Pitch 02 · Solution Narrative</label>
              <textarea id="docs-edit-solution" rows="3" class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-950 dark:text-white">${esc(content.pitch.slides[1]?.body || '')}</textarea>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="docs-edit-overview" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">B. Product Overview</label>
              <textarea id="docs-edit-overview" rows="3" class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-950 dark:text-white">${esc(content.technicalSections.productOverview)}</textarea>
            </div>
            <div>
              <label for="docs-edit-changelog" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">O. Changelog</label>
              <textarea id="docs-edit-changelog" rows="3" class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-950 dark:text-white">${esc(content.technicalSections.changelog)}</textarea>
            </div>
          </div>

          <div class="flex justify-end pt-2 border-t border-zinc-200 dark:border-[#24272F]">
            <button
              type="submit"
              class="px-5 py-2.5 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-xs font-semibold transition-colors"
            >
              Save Section Edits
            </button>
          </div>
        </form>
      `
          : ''
      }

      ${
        tab === 'team'
          ? `
        <form id="docs-team-form" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${content.team
              .map(
                (member, idx) => `
              <div class="p-4 rounded-2xl bg-zinc-50 dark:bg-[#191C22] border border-zinc-200/80 dark:border-[#282C35] space-y-2.5">
                <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Member ${idx + 1}</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input type="text" data-team-field="name" data-team-idx="${idx}" value="${esc(member.name)}" placeholder="Full Name" aria-label="Member ${idx + 1} name" class="px-3 py-2 rounded-xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-950 dark:text-white" />
                  <input type="text" data-team-field="role" data-team-idx="${idx}" value="${esc(member.role)}" placeholder="Role" aria-label="Member ${idx + 1} role" class="px-3 py-2 rounded-xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-950 dark:text-white" />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input type="text" data-team-field="github" data-team-idx="${idx}" value="${esc(member.github)}" placeholder="GitHub username" aria-label="Member ${idx + 1} GitHub" class="px-3 py-2 rounded-xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-950 dark:text-white" />
                  <input type="email" data-team-field="email" data-team-idx="${idx}" value="${esc(member.email)}" placeholder="Email address" aria-label="Member ${idx + 1} Email" class="px-3 py-2 rounded-xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-950 dark:text-white" />
                </div>
                <input type="url" data-team-field="photoUrl" data-team-idx="${idx}" value="${esc(member.photoUrl || '')}" placeholder="Profile photo URL (optional — initials shown cleanly if blank)" aria-label="Member ${idx + 1} Photo URL" class="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-950 dark:text-white" />
              </div>
            `
              )
              .join('')}
          </div>
          <div class="flex justify-end pt-2 border-t border-zinc-200 dark:border-[#24272F]">
            <button
              type="submit"
              class="px-5 py-2.5 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-xs font-semibold transition-colors"
            >
              Save Team Roster
            </button>
          </div>
        </form>
      `
          : ''
      }
    </section>
  `;
}

export function renderDocsView(state) {
  try {
    const content = getDocsContent();
    const accessConfig = getDocsAccessConfig();
    const accessResult = evaluateDocsAccess(accessConfig);
    const adminUnlocked = isDocsAdminUnlocked();
    const liveMetrics = computeDocsLiveMetrics(state, {
      MEAL_CATALOG,
      RECOVERY_MEALS,
      ILLNESS_OPTIONS,
      HEALTH_CONDITIONS,
      ALLERGY_OPTIONS,
      ANALYZER_PRESETS,
    });

    // Public Access Gate (403 Unavailable) when visibility is OFF or outside window
    if (!accessResult.allowed && !(adminUnlocked && docsUiState.adminModeActive)) {
      return `
        <div class="max-w-2xl mx-auto py-12 sm:py-20 space-y-6">
          <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-8 sm:p-10 text-center space-y-5">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center">
              ${icon('lock', 'w-7 h-7')}
            </div>
            <p class="text-xs font-mono-num font-semibold text-zinc-500 dark:text-zinc-400">HTTP 403 · Access Restricted</p>
            <h1 class="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white">
              Documentation Currently Unavailable
            </h1>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              ${esc(accessResult.summaryText)}
            </p>
            <div class="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                data-nav="home"
                class="px-5 py-2.5 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-xs font-semibold transition-colors"
              >
                Return to NutriSense App
              </button>
              <button
                type="button"
                data-docs-action="toggle-admin"
                class="px-5 py-2.5 rounded-full border border-zinc-200 dark:border-[#2B2E36] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-[#B8F527] transition-colors"
              >
                ${adminUnlocked ? 'Open Admin Controls' : 'Administrator Unlock'}
              </button>
            </div>
          </div>
          ${renderAdminUnlockPrompt()}
        </div>
      `;
    }

    const filteredNav = filterDocsNavItems(DOCS_NAV_ITEMS, docsUiState.searchQuery).filter(
      (item) => {
        if (docsUiState.sectionFilter === 'pitch') return item.group === 'Pitch Deck';
        if (docsUiState.sectionFilter === 'tech') return item.group === 'Documentation';
        return true;
      }
    );

    const showPitch = docsUiState.sectionFilter !== 'tech';
    const showTech = docsUiState.sectionFilter !== 'pitch';

    const statusClass = (status) => {
      if (status === 'Live') return 'text-[#658C0A] dark:text-[#B8F527] font-semibold';
      if (status === 'Beta') return 'text-amber-600 dark:text-amber-300 font-semibold';
      return 'text-zinc-500 dark:text-zinc-400 font-medium';
    };

    return `
      <div id="docs-root" class="space-y-8">
        <!-- Hero & Action Bar -->
        <section class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 sm:p-8 space-y-6">
          <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div class="space-y-3 max-w-3xl">
              <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <span class="text-[#658C0A] dark:text-[#B8F527] font-semibold">${esc(content.meta.event)}</span>
                <span aria-hidden="true"> · </span>
                <span>${esc(content.meta.teamName)}</span>
                <span aria-hidden="true"> · </span>
                <span>${esc(content.meta.version)}</span>
              </p>
              <h1 class="font-display text-2xl sm:text-4xl font-bold text-zinc-950 dark:text-white tracking-tight" style="text-wrap: balance;">
                ${esc(content.meta.productName)}: ${esc(content.meta.tagline)}
              </h1>
              <p class="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                ${esc(content.meta.university)} — Live Y Combinator-style product pitch, full system architecture, database schema, and real-time runtime metrics synchronized with NutriSense.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
              <button
                type="button"
                data-docs-action="print-docs"
                class="px-3.5 py-2 rounded-full border border-zinc-200 dark:border-[#2B2E36] text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-[#B8F527] transition-colors whitespace-nowrap shrink-0"
              >
                Print / PDF
              </button>
              <button
                type="button"
                data-docs-action="export-md"
                class="px-3.5 py-2 rounded-full border border-zinc-200 dark:border-[#2B2E36] text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-[#B8F527] transition-colors whitespace-nowrap shrink-0"
              >
                Export .md
              </button>
              <button
                type="button"
                data-docs-action="copy-link"
                class="px-3.5 py-2 rounded-full border border-zinc-200 dark:border-[#2B2E36] text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-[#B8F527] transition-colors whitespace-nowrap shrink-0"
              >
                Copy Link
              </button>
              <button
                type="button"
                data-docs-action="toggle-admin"
                class="px-4 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  adminUnlocked && docsUiState.adminModeActive
                    ? 'bg-[#B8F527] text-zinc-950'
                    : 'bg-zinc-900 text-white dark:bg-[#1E2127] dark:text-zinc-100 border border-zinc-200 dark:border-[#2C3038] hover:border-[#B8F527]'
                }"
              >
                ${
                  adminUnlocked && docsUiState.adminModeActive
                    ? 'Exit Admin Mode'
                    : adminUnlocked
                      ? 'Admin Editor'
                      : 'Admin Access'
                }
              </button>
            </div>
          </div>

          <!-- Live Data-Driven System Telemetry -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-5 border-t border-zinc-200 dark:border-[#23262E]">
            <div class="space-y-1">
              <p class="text-xs text-zinc-500 dark:text-zinc-400">Live Food Catalog</p>
              <p class="font-display text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">
                ${liveMetrics.totalMealTemplates} <span class="text-xs font-normal text-zinc-500">dishes</span>
              </p>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">${liveMetrics.catalogMealCount} standard · ${liveMetrics.recoveryMealCount} recovery</p>
            </div>
            <div class="space-y-1">
              <p class="text-xs text-zinc-500 dark:text-zinc-400">Clinical &amp; Allergen Rules</p>
              <p class="font-display text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">
                ${liveMetrics.healthConditionCount + liveMetrics.allergyOptionCount} <span class="text-xs font-normal text-zinc-500">guards</span>
              </p>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">${liveMetrics.illnessModes} illness modes · ${liveMetrics.allergyOptionCount} allergens</p>
            </div>
            <div class="space-y-1">
              <p class="text-xs text-zinc-500 dark:text-zinc-400">Supabase Schema</p>
              <p class="font-display text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">
                ${liveMetrics.supabaseTablesCount} <span class="text-xs font-normal text-zinc-500">RLS tables</span>
              </p>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">${liveMetrics.logsCount} active food logs</p>
            </div>
            <div class="space-y-1">
              <p class="text-xs text-zinc-500 dark:text-zinc-400">Runtime Context</p>
              <p class="font-display text-2xl font-bold tabular-nums text-[#658C0A] dark:text-[#B8F527]">
                ${liveMetrics.targetCalories} <span class="text-xs font-normal text-zinc-500">kcal target</span>
              </p>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">${esc(liveMetrics.authStatus)}</p>
            </div>
          </div>
        </section>

        ${renderAdminUnlockPrompt()}
        ${renderAdminEditorPanel(content, accessConfig, accessResult)}

        <!-- Sidebar + Main Documentation Workspace -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <!-- Sticky Left Outline Sidebar -->
          <aside class="lg:col-span-3 lg:sticky lg:top-20 space-y-4 print:hidden">
            <div class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-4 space-y-4">
              <div>
                <label for="docs-search-input" class="sr-only">Filter documentation sections</label>
                <div class="relative">
                  <span class="absolute left-3 top-2.5 text-zinc-400 pointer-events-none">${icon('search', 'w-4 h-4')}</span>
                  <input
                    id="docs-search-input"
                    type="search"
                    value="${esc(docsUiState.searchQuery)}"
                    placeholder="Filter sections..."
                    class="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
                  />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#1B1D23]">
                ${[
                  { id: 'all', label: 'All' },
                  { id: 'pitch', label: 'Pitch' },
                  { id: 'tech', label: 'Docs' },
                ]
                  .map(
                    (f) => `
                  <button
                    type="button"
                    data-docs-filter="${f.id}"
                    class="py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      docsUiState.sectionFilter === f.id
                        ? 'bg-[#B8F527] text-zinc-950'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                    }"
                  >${f.label}</button>
                `
                  )
                  .join('')}
              </div>

              <nav aria-label="Documentation outline" class="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                ${
                  filteredNav.length
                    ? filteredNav
                        .map(
                          (item) => `
                    <a
                      href="#${item.id}"
                      data-docs-anchor="${item.id}"
                      class="px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#1B1D23] whitespace-nowrap shrink-0 transition-colors"
                    >${esc(item.label)}</a>
                  `
                        )
                        .join('')
                    : `<p class="text-xs text-zinc-500 px-2 py-1">No matching sections.</p>`
                }
              </nav>
            </div>
          </aside>

          <!-- Main Documentation Content -->
          <div class="lg:col-span-9 space-y-10 min-w-0">
            ${
              showPitch
                ? `
              <!-- A. YC-Style Pitch Deck -->
              <section id="docs-pitch" class="space-y-5 scroll-mt-24">
                <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section A · Startup &amp; Product Thesis</p>
                    <h2 class="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white mt-0.5">
                      Y Combinator–Style Pitch Deck
                    </h2>
                  </div>
                  <span class="text-xs text-zinc-500 dark:text-zinc-400">10 Core Investor &amp; Judge Slides</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  ${content.pitch.slides
                    .map(
                      (slide) => `
                    <article class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 sm:p-6 space-y-3">
                      <p class="text-xs font-mono-num font-semibold text-[#658C0A] dark:text-[#B8F527]">${esc(slide.label)}</p>
                      <h3 class="font-display text-lg font-bold text-zinc-950 dark:text-white leading-snug">${esc(slide.title)}</h3>
                      <p class="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">${esc(slide.body)}</p>
                      <ul class="pt-2 border-t border-zinc-200 dark:border-[#23262E] space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                        ${(slide.bullets || [])
                          .map((b) => `<li class="flex items-start gap-2"><span class="text-[#658C0A] dark:text-[#B8F527] font-bold">·</span><span>${esc(b)}</span></li>`)
                          .join('')}
                      </ul>
                    </article>
                  `
                    )
                    .join('')}
                </div>
              </section>

              <!-- Team Showcase: DIU_Coderunners -->
              <section id="docs-team" class="space-y-5 scroll-mt-24">
                <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Team DIU_Coderunners · Daffodil International University</p>
                    <h2 class="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white mt-0.5">
                      Founding Engineering Team
                    </h2>
                  </div>
                  <span class="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">${content.team.length} Core Builders</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  ${content.team
                    .map(
                      (member) => `
                    <article class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 flex flex-col justify-between gap-4">
                      <div class="space-y-4">
                        <div class="flex items-center gap-3.5">
                          ${renderTeamAvatar(member)}
                          <div class="min-w-0">
                            <h3 class="font-display text-base font-bold text-zinc-950 dark:text-white truncate">${esc(member.name)}</h3>
                            <p class="text-xs font-medium text-[#658C0A] dark:text-[#B8F527] mt-0.5 leading-snug">${esc(member.role)}</p>
                          </div>
                        </div>
                        <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">${esc(member.bio || '')}</p>
                      </div>
                      <div class="pt-3 border-t border-zinc-200 dark:border-[#23262E] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <a
                          href="https://github.com/${encodeURIComponent(member.github)}"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="font-mono-num font-semibold text-zinc-800 dark:text-zinc-200 hover:text-[#658C0A] dark:hover:text-[#B8F527] transition-colors"
                        >
                          github.com/${esc(member.github)}
                        </a>
                        ${
                          member.email
                            ? `<a href="mailto:${esc(member.email)}" class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white truncate max-w-[190px]">${esc(member.email)}</a>`
                            : ''
                        }
                      </div>
                    </article>
                  `
                    )
                    .join('')}
                </div>
              </section>
            `
                : ''
            }

            ${
              showTech
                ? `
              <!-- B. Product Overview -->
              <section id="docs-overview" class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-3 scroll-mt-24">
                <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section B · Product Overview</p>
                <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white">Target Users &amp; Core Use Cases</h2>
                <p class="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">${esc(content.technicalSections.productOverview)}</p>
              </section>

              <!-- C. Feature Matrix -->
              <section id="docs-features" class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4 scroll-mt-24">
                <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section C · Feature Matrix</p>
                    <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white mt-0.5">Live Platform Capabilities</h2>
                  </div>
                  <span class="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">${content.features.length} Modules Tracked</span>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr class="border-b border-zinc-200 dark:border-[#24272F] text-xs text-zinc-500 dark:text-zinc-400">
                        <th class="py-2.5 pr-4 font-semibold">Feature</th>
                        <th class="py-2.5 pr-4 font-semibold">Status</th>
                        <th class="py-2.5 pr-4 font-semibold">Module</th>
                        <th class="py-2.5 font-semibold">Implementation Summary</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-200/70 dark:divide-[#22252D]">
                      ${content.features
                        .map(
                          (f) => `
                        <tr class="hover:bg-zinc-50 dark:hover:bg-[#171A20]">
                          <td class="py-3 pr-4 font-semibold text-zinc-950 dark:text-white whitespace-nowrap">${esc(f.name)}</td>
                          <td class="py-3 pr-4 text-xs whitespace-nowrap ${statusClass(f.status)}">${esc(f.status)}</td>
                          <td class="py-3 pr-4 text-xs font-mono-num text-zinc-500 dark:text-zinc-400 whitespace-nowrap">${esc(f.scope)}</td>
                          <td class="py-3 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">${esc(f.summary)}</td>
                        </tr>
                      `
                        )
                        .join('')}
                    </tbody>
                  </table>
                </div>
              </section>

              <!-- D. Architecture Diagram -->
              <section id="docs-architecture" class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4 scroll-mt-24">
                <div>
                  <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section D · System Architecture</p>
                  <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white mt-0.5">End-to-End Runtime Topology</h2>
                  <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    User Browser (Vite / Vanilla JS) → Supabase Auth &amp; PostgreSQL + Google Gemini AI API (with Local Fallback) → Vercel Edge Hosting
                  </p>
                </div>
                ${renderArchitectureDiagramSVG()}
              </section>

              <!-- E. Data Flow Diagram -->
              <section id="docs-dataflow" class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4 scroll-mt-24">
                <div>
                  <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section E · Data Pipeline</p>
                  <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white mt-0.5">Biometrics-to-Feedback Data Flow</h2>
                </div>
                ${renderDataFlowDiagramSVG()}
              </section>

              <!-- F. Technology Stack -->
              <section id="docs-stack" class="space-y-4 scroll-mt-24">
                <div>
                  <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section F · Technology Stack</p>
                  <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white mt-0.5">Production Engineering Choices</h2>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  ${content.techStack
                    .map(
                      (t) => `
                    <div class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 space-y-2">
                      <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">${esc(t.layer)}</p>
                      <h3 class="font-display text-base font-bold text-zinc-950 dark:text-white">${esc(t.stack)}</h3>
                      <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">${esc(t.details)}</p>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </section>

              <!-- G. API Documentation -->
              <section id="docs-api" class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4 scroll-mt-24">
                <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section G · API Documentation</p>
                <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white">Supabase &amp; Gemini Integrations</h2>
                <p class="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">${esc(content.technicalSections.apiDocs)}</p>
                <pre class="p-4 rounded-xl bg-zinc-950 text-zinc-100 text-xs font-mono overflow-x-auto leading-relaxed"><code>// Supabase workspace sync + Gemini context injection summary
const workspace = await fetchUserWorkspace(user, defaults);
if (!workspace.hasSavedHealthProfile) store.setUI({ profileSetupModalOpen: true });

// AI reply with targetCalories, proteinG &amp; illnessMode context
const reply = await generateAssistantReply(userQuestion, store.getState());</code></pre>
              </section>

              <!-- H. Data Layer -->
              <section id="docs-data" class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4 scroll-mt-24">
                <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section H · Data Layer &amp; RLS</p>
                <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white">PostgreSQL Schema &amp; Isolation</h2>
                <p class="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">${esc(content.technicalSections.dataLayer)}</p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#191C22] border border-zinc-200/80 dark:border-[#262932]">
                    <p class="font-mono-num font-bold text-zinc-950 dark:text-white">user_profiles</p>
                    <p class="text-zinc-500 dark:text-zinc-400 mt-1">Identity, theme, active day, illness mode</p>
                  </div>
                  <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#191C22] border border-zinc-200/80 dark:border-[#262932]">
                    <p class="font-mono-num font-bold text-zinc-950 dark:text-white">user_health_profiles</p>
                    <p class="text-zinc-500 dark:text-zinc-400 mt-1">Age, height, weight, goal, conditions, allergies</p>
                  </div>
                  <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#191C22] border border-zinc-200/80 dark:border-[#262932]">
                    <p class="font-mono-num font-bold text-zinc-950 dark:text-white">nutrition_targets &amp; plans</p>
                    <p class="text-zinc-500 dark:text-zinc-400 mt-1">BMR, TDEE, macros, 28 meal slots, food logs</p>
                  </div>
                </div>
              </section>

              <!-- I. AI Layer -->
              <section id="docs-ai" class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-3 scroll-mt-24">
                <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section I · AI Layer</p>
                <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white">Gemini Context Injection &amp; Deterministic Fallback</h2>
                <p class="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">${esc(content.technicalSections.aiLayer)}</p>
              </section>

              <!-- J. Product Roadmap -->
              <section id="docs-roadmap" class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-3 scroll-mt-24">
                <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section J · Product Roadmap</p>
                <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white">Short, Mid &amp; Long-Term Execution</h2>
                <p class="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">${esc(content.technicalSections.roadmap)}</p>
              </section>

              <!-- K-M. Performance, Security, Analytics -->
              <section id="docs-ops" class="grid grid-cols-1 md:grid-cols-3 gap-4 scroll-mt-24">
                <article class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 space-y-2">
                  <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section K · Performance</p>
                  <h3 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Scalability &amp; Speed</h3>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">${esc(content.technicalSections.performance)}</p>
                </article>
                <article class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 space-y-2">
                  <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section L · Security</p>
                  <h3 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Auth &amp; Privacy</h3>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">${esc(content.technicalSections.security)}</p>
                </article>
                <article class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 space-y-2">
                  <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section M · Analytics</p>
                  <h3 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Live Telemetry</h3>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">${esc(content.technicalSections.analytics)}</p>
                </article>
              </section>

              <!-- N-O. Contributors & Changelog -->
              <section id="docs-changelog" class="rounded-2xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4 scroll-mt-24">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section N · Contributors</p>
                    <h2 class="font-display text-xl font-bold text-zinc-950 dark:text-white">Team &amp; Attribution</h2>
                    <p class="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">${esc(content.technicalSections.contributors)}</p>
                  </div>
                  <div class="space-y-2">
                    <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Section O · Changelog</p>
                    <h2 class="font-display text-xl font-bold text-zinc-950 dark:text-white">Release History</h2>
                    <p class="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line font-mono-num">${esc(content.technicalSections.changelog)}</p>
                  </div>
                </div>
              </section>
            `
                : ''
            }
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    return `
      <div class="max-w-xl mx-auto py-16">
        <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-8 text-center space-y-4">
          <h1 class="font-display text-2xl font-bold text-zinc-950 dark:text-white">Unable to Render Documentation</h1>
          <p class="text-sm text-zinc-600 dark:text-zinc-400">${esc(err?.message || 'An unexpected error occurred in /docs.')}</p>
          <button
            type="button"
            data-nav="home"
            class="px-5 py-2.5 rounded-full bg-[#B8F527] text-zinc-950 text-xs font-semibold"
          >Return Home</button>
        </div>
      </div>
    `;
  }
}

export function bindDocsViewEvents(root, rerender) {
  root.querySelector('#docs-search-input')?.addEventListener('input', (e) => {
    const val = e.target.value;
    const selStart = e.target.selectionStart;
    docsUiState.searchQuery = val;
    rerender();
    const nextInput = document.getElementById('docs-search-input');
    if (nextInput) {
      nextInput.focus();
      if (typeof selStart === 'number') {
        nextInput.setSelectionRange(selStart, selStart);
      }
    }
  });

  root.querySelectorAll('[data-docs-filter]').forEach((btn) =>
    btn.addEventListener('click', () => {
      docsUiState.sectionFilter = btn.getAttribute('data-docs-filter') || 'all';
      rerender();
    })
  );

  root.querySelectorAll('[data-docs-anchor]').forEach((link) =>
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('data-docs-anchor');
      const targetEl = targetId ? document.getElementById(targetId) : null;
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    })
  );

  root.querySelector('[data-docs-action="print-docs"]')?.addEventListener('click', () => {
    window.print();
  });

  root.querySelector('[data-docs-action="export-md"]')?.addEventListener('click', () => {
    const content = getDocsContent();
    const metrics = computeDocsLiveMetrics(store.getState(), {
      MEAL_CATALOG,
      RECOVERY_MEALS,
      ILLNESS_OPTIONS,
      HEALTH_CONDITIONS,
      ALLERGY_OPTIONS,
      ANALYZER_PRESETS,
    });
    const md = exportDocsToMarkdown(content, metrics);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nutrisense-pitch-and-docs.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported Markdown documentation');
  });

  root.querySelector('[data-docs-action="copy-link"]')?.addEventListener('click', async () => {
    const shareUrl = `${window.location.origin}/docs`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Copied /docs link to clipboard');
    } catch {
      showToast(`Share URL: ${shareUrl}`);
    }
  });

  root.querySelector('[data-docs-action="toggle-admin"]')?.addEventListener('click', () => {
    if (isDocsAdminUnlocked()) {
      docsUiState.adminModeActive = !docsUiState.adminModeActive;
      docsUiState.unlockPromptOpen = false;
      docsUiState.unlockError = '';
      rerender();
      return;
    }
    docsUiState.unlockPromptOpen = !docsUiState.unlockPromptOpen;
    docsUiState.unlockError = '';
    rerender();
  });

  root.querySelector('[data-docs-action="close-admin-unlock"]')?.addEventListener('click', () => {
    docsUiState.unlockPromptOpen = false;
    docsUiState.unlockError = '';
    rerender();
  });

  root.querySelector('#docs-admin-unlock-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = root.querySelector('#docs-admin-passcode');
    const pass = input?.value || '';
    if (verifyDocsAdminPasscode(pass)) {
      docsUiState.unlockPromptOpen = false;
      docsUiState.unlockError = '';
      docsUiState.adminModeActive = true;
      showToast('Admin Editor unlocked');
      rerender();
    } else {
      docsUiState.unlockError = 'Invalid admin passcode. Please try again.';
      rerender();
    }
  });

  root.querySelector('[data-docs-action="lock-admin"]')?.addEventListener('click', () => {
    lockDocsAdmin();
    docsUiState.adminModeActive = false;
    showToast('Admin Editor locked (Public Reader active)');
    rerender();
  });

  root.querySelector('[data-docs-action="reset-defaults"]')?.addEventListener('click', () => {
    resetDocsContent();
    showToast('Reset documentation & team content to defaults');
    rerender();
  });

  root.querySelectorAll('[data-docs-admin-tab]').forEach((btn) =>
    btn.addEventListener('click', () => {
      docsUiState.adminTab = btn.getAttribute('data-docs-admin-tab') || 'access';
      rerender();
    })
  );

  root.querySelector('#docs-access-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const visibilityEnabled = Boolean(root.querySelector('#docs-visibility-toggle')?.checked);
    const scheduleMode = root.querySelector('#docs-schedule-mode')?.value || 'always';
    const startRaw = root.querySelector('#docs-start-at')?.value || '';
    const endRaw = root.querySelector('#docs-end-at')?.value || '';
    const durationHours = Math.max(1, Number(root.querySelector('#docs-duration-hours')?.value) || 72);

    const startAt = startRaw ? new Date(startRaw).toISOString() : '';
    const endAt = endRaw ? new Date(endRaw).toISOString() : '';

    saveDocsAccessConfig({
      visibilityEnabled,
      scheduleMode,
      startAt,
      endAt,
      durationHours,
      publishedAt: new Date().toISOString(),
    });
    showToast('Saved /docs access & publishing schedule');
    rerender();
  });

  root.querySelector('#docs-content-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const current = getDocsContent();
    const tagline = root.querySelector('#docs-edit-tagline')?.value?.trim() || current.meta.tagline;
    const version = root.querySelector('#docs-edit-version')?.value?.trim() || current.meta.version;
    const problemBody = root.querySelector('#docs-edit-problem')?.value || '';
    const solutionBody = root.querySelector('#docs-edit-solution')?.value || '';
    const overview = root.querySelector('#docs-edit-overview')?.value || '';
    const changelog = root.querySelector('#docs-edit-changelog')?.value || '';

    const nextSlides = current.pitch.slides.map((s, idx) => {
      if (idx === 0 && problemBody) return { ...s, body: problemBody };
      if (idx === 1 && solutionBody) return { ...s, body: solutionBody };
      return s;
    });

    saveDocsContent({
      ...current,
      meta: { ...current.meta, tagline, version },
      pitch: { ...current.pitch, slides: nextSlides },
      technicalSections: {
        ...current.technicalSections,
        productOverview: overview,
        changelog,
      },
    });
    showToast('Saved pitch & documentation edits');
    rerender();
  });

  root.querySelector('#docs-team-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const current = getDocsContent();
    const nextTeam = current.team.map((m, idx) => {
      const readField = (field) =>
        root.querySelector(`[data-team-field="${field}"][data-team-idx="${idx}"]`)?.value?.trim();
      return {
        ...m,
        name: readField('name') || m.name,
        role: readField('role') || m.role,
        github: readField('github') || m.github,
        email: readField('email') ?? m.email,
        photoUrl: readField('photoUrl') ?? '',
      };
    });

    saveDocsContent({
      ...current,
      team: nextTeam,
    });
    showToast('Saved DIU_Coderunners team roster');
    rerender();
  });
}

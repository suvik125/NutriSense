import { icon } from './icons.js';
import { store } from '../state/store.js';
import { showToast } from './toast.js';
import { supabase } from '../supabaseClient.js';
import { isWithinQuietHours } from '../utils/notifications.js';
import { renderProfileFormFieldsHTML } from './profileForm.js';
import { ftInToCm, lbToKg } from '../utils/nutrition.js';
import {
  getBrowserNotificationPermission,
  playNotificationChime,
  requestBrowserNotificationPermission,
  triggerNotificationVibration,
} from '../utils/notificationEffects.js';
import { renderRagChatbot, bindRagChatbotEvents } from './ragChatbot.js';

let setupDraftBio = null;
let setupDraftConditions = null;
let setupDraftAllergies = null;
let setupDraftUserId = null;
let setupIsSaving = false;

function ensureSetupDraft(state, forceReset = false) {
  const ownerKey = state.authUserId || 'guest';
  if (forceReset || !setupDraftBio || setupDraftUserId !== ownerKey) {
    setupDraftBio = { ...state.profile.biometrics };
    setupDraftConditions = [...(state.profile.healthConditions || [])];
    setupDraftAllergies = [...(state.profile.allergies || [])];
    setupDraftUserId = ownerKey;
    setupIsSaving = false;
  }
}

export function renderModalsAndAssistant(state, ui) {
  return `
    ${renderAuthModal(state, ui)}
    ${renderProfileSetupModal(state, ui)}
    ${renderNotificationsDrawer(state, ui)}
    ${renderRagChatbot(state, ui)}
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderAuthModal(state, ui) {
  if (!ui.authModalOpen) return '';
  const isSignup = ui.authModalTab === 'signup';
  const prefillEmail = !isSignup && ui.authPrefillEmail ? escapeHtml(ui.authPrefillEmail) : '';
  const successMessage = !isSignup && ui.authSuccessMessage ? escapeHtml(ui.authSuccessMessage) : '';

  return `
    <div
      id="auth-modal-backdrop"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div class="w-full max-w-md rounded-3xl bg-white dark:bg-[#14161A] border border-zinc-200 dark:border-[#272A32] p-6 sm:p-7 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-title" class="font-display text-2xl font-bold text-zinc-950 dark:text-white">
              ${isSignup ? 'Create NutriSense Account' : 'Welcome Back'}
            </h2>
            <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Sync your nutrition targets, adaptive meal plans, and food logs.
            </p>
          </div>
          <button
            type="button"
            data-action="close-auth"
            aria-label="Close sign in dialog"
            class="w-9 h-9 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-[#1E2127] text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
          >
            ${icon('x', 'w-4 h-4')}
          </button>
        </div>

        <!-- Tabs -->
        <div class="grid grid-cols-2 gap-1 p-1 mt-5 rounded-xl bg-zinc-100 dark:bg-[#1C1E24]">
          <button
            type="button"
            data-auth-tab="login"
            class="py-2 text-xs font-semibold rounded-lg transition-colors ${
              !isSignup
                ? 'bg-white dark:bg-[#282C34] text-zinc-950 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }"
          >
            Sign In
          </button>
          <button
            type="button"
            data-auth-tab="signup"
            class="py-2 text-xs font-semibold rounded-lg transition-colors ${
              isSignup
                ? 'bg-white dark:bg-[#282C34] text-zinc-950 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }"
          >
            Create Account
          </button>
        </div>

        <!-- One-Click Demo Access -->
        <div class="mt-5 p-3.5 rounded-2xl bg-[#B8F527]/12 border border-[#B8F527]/40 flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold text-zinc-900 dark:text-[#B8F527]">Instant Demo Mode</p>
            <p class="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">Preview My Foods with sample history</p>
          </div>
          <button
            type="button"
            data-action="modal-demo-signin"
            class="px-3.5 py-2 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            Demo Sign-in
          </button>
        </div>

        ${
          successMessage
            ? `
          <div
            id="auth-success"
            role="status"
            class="mt-5 p-3.5 rounded-2xl bg-[#B8F527]/12 border border-[#B8F527]/40 text-xs font-medium text-zinc-900 dark:text-[#B8F527] leading-relaxed"
          >
            ${successMessage}
          </div>`
            : ''
        }

        <form id="auth-form" class="mt-5 space-y-4" novalidate>
          ${
            isSignup
              ? `
            <div>
              <label for="auth-name" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Full Name</label>
              <input
                id="auth-name"
                name="name"
                type="text"
                required
                placeholder="Alex Mercer"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D22] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#B8F527]"
              />
            </div>`
              : ''
          }
          <div>
            <label for="auth-email" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email Address</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              required
              value="${prefillEmail}"
              placeholder="you@example.com"
              class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D22] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#B8F527]"
            />
          </div>
          <div>
            <label for="auth-password" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Password</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              required
              minlength="6"
              placeholder="Minimum 6 characters"
              class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D22] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#B8F527]"
            />
          </div>
          <button
            type="submit"
            class="w-full py-3 rounded-xl bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 font-semibold text-sm transition-colors"
          >
            ${isSignup ? 'Create Account & Continue' : 'Sign In'}
          </button>
        </form>
        <p id="auth-error" class="hidden mt-3 text-xs font-medium text-red-500" role="alert"></p>
        <p id="auth-notice" class="hidden mt-3 text-xs font-medium text-[#658C0A] dark:text-[#B8F527]" role="status"></p>

        <div class="mt-4 flex items-center gap-3">
          <div class="h-px flex-1 bg-zinc-200 dark:bg-[#272A32]"></div>
          <span class="text-[11px] text-zinc-400">or</span>
          <div class="h-px flex-1 bg-zinc-200 dark:bg-[#272A32]"></div>
        </div>

        <button
          type="button"
          data-action="google-signin"
          class="mt-4 w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-[#2B2E36] bg-zinc-50 dark:bg-[#1A1C21] hover:bg-zinc-100 dark:hover:bg-[#22252C] text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2.5 transition-colors"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.7 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.6c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.7z"/>
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5H1.2v3.1C3.2 21.4 7.3 24 12 24z"/>
            <path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.2C.4 8.2 0 10.1 0 12s.4 3.8 1.2 5.4l4-3.1z"/>
            <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.6 1.2 6.6l4 3.1c1-2.9 3.7-4.9 6.8-4.9z"/>
          </svg>
          <span>Continue with Google (Demo)</span>
        </button>
        <p class="mt-3 text-[11px] text-center text-zinc-500 dark:text-zinc-400">
          Simulated local prototype authentication. Data stays in your browser.
        </p>
      </div>
    </div>
  `;
}

function renderProfileSetupModal(state, ui) {
  if (!ui.profileSetupModalOpen) return '';
  ensureSetupDraft(state);

  return `
    <div
      id="profile-setup-backdrop"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-setup-title"
    >
      <div
        id="profile-setup-card"
        class="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto my-auto space-y-6"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Personalized Nutrition Setup</p>
            <h2 id="profile-setup-title" class="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white mt-1">
              Complete Your Nutrition Profile
            </h2>
            <p class="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              Set your biometrics, daily movement, goals, and sensitivities to personalize your daily calorie, macro, and meal plan targets.
            </p>
          </div>
          <button
            type="button"
            data-action="close-profile-setup"
            aria-label="Close profile setup dialog"
            class="w-9 h-9 rounded-full shrink-0 flex items-center justify-center bg-zinc-100 dark:bg-[#1E2127] text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            ${icon('x', 'w-4 h-4')}
          </button>
        </div>

        <form id="profile-setup-form" class="space-y-6">
          ${renderProfileFormFieldsHTML({
            prefix: 'setup',
            draftBio: setupDraftBio,
            draftConditions: setupDraftConditions,
            draftAllergies: setupDraftAllergies,
            resetAction: 'reset-profile-setup',
            isSaving: setupIsSaving,
          })}
        </form>
      </div>
    </div>
  `;
}

function renderNotificationsDrawer(state, ui) {
  if (!ui.notificationsOpen) return '';
  const prefs = state.notificationPrefs || {};
  const hydration = state.hydration || { glasses: 0, goalGlasses: 8 };
  const glasses = Number(hydration.glasses) || 0;
  const goalGlasses = Number(hydration.goalGlasses) || 8;
  const pushPerm = getBrowserNotificationPermission();
  const quietNow = isWithinQuietHours(prefs);

  const pushHint =
    pushPerm === 'granted'
      ? 'Permission granted'
      : pushPerm === 'denied'
        ? 'Blocked in browser settings'
        : pushPerm === 'unsupported'
          ? 'Not supported in this browser'
          : 'Prompts for browser permission';

  const listHtml = state.notifications.length
    ? state.notifications
        .map(
          (n) => `
          <div data-notif-card="${escapeHtml(n.id)}" class="p-3.5 rounded-2xl border ${
            n.read
              ? 'border-zinc-200 dark:border-[#24272F] bg-zinc-50 dark:bg-[#17191E]'
              : 'border-[#B8F527]/40 bg-[#B8F527]/5 dark:bg-[#1B2014]'
          }">
            <div class="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>${escapeHtml(n.category)} · ${escapeHtml(n.timeLabel)}</span>
              <div class="flex items-center gap-1.5 shrink-0">
                ${!n.read ? '<span class="text-[11px] font-semibold text-[#658C0A] dark:text-[#B8F527]">New</span>' : ''}
                <button
                  type="button"
                  data-action="delete-notification"
                  data-notif-id="${escapeHtml(n.id)}"
                  aria-label="Delete notification"
                  title="Remove notification"
                  class="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-200/70 dark:hover:bg-[#24272F] transition-colors"
                >${icon('x', 'w-3.5 h-3.5')}</button>
              </div>
            </div>
            <p class="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">${escapeHtml(n.title)}</p>
            <p class="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">${escapeHtml(n.message)}</p>
          </div>
        `
        )
        .join('')
    : '<p class="text-sm text-zinc-500 py-6 text-center">No notifications yet.</p>';

  const waterSegments = Array.from({ length: goalGlasses }, (_, idx) => {
    const filled = idx < glasses;
    return `<span class="h-1.5 rounded-full transition-colors ${
      filled ? 'bg-[#B8F527]' : 'bg-zinc-200 dark:bg-[#262A33]'
    }"></span>`;
  }).join('');

  return `
    <div
      id="notifications-backdrop"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-drawer-title"
    >
      <div class="w-full max-w-md h-full bg-white dark:bg-[#121418] border-l border-zinc-200 dark:border-[#252830] flex flex-col">
        <div class="px-5 py-4 border-b border-zinc-200 dark:border-[#23262E] flex items-center justify-between gap-3">
          <div>
            <h2 id="notif-drawer-title" class="font-display text-lg font-bold text-zinc-950 dark:text-white">Notifications &amp; Reminders</h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">Meal schedules, macro insights &amp; quiet hours</p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-action="mark-all-read"
              class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527] hover:underline px-1.5 py-1 whitespace-nowrap"
            >Mark all read</button>
            <button
              type="button"
              data-action="clear-all-notifications"
              ${state.notifications.length === 0 ? 'disabled' : ''}
              class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 disabled:opacity-40 disabled:pointer-events-none px-1.5 py-1 whitespace-nowrap transition-colors"
            >Clear all</button>
            <button
              type="button"
              data-action="close-notifications"
              aria-label="Close notifications"
              class="w-9 h-9 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-[#1D2026] text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >${icon('x', 'w-4 h-4')}</button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-5 space-y-6">
          <section class="space-y-3.5">
            <h3 class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Notification Preferences</h3>

            <label class="flex items-center justify-between gap-3 cursor-pointer">
              <span class="text-sm text-zinc-800 dark:text-zinc-200">Meal-Time Reminders</span>
              <input type="checkbox" data-pref="mealReminders" ${prefs.mealReminders ? 'checked' : ''} class="w-4 h-4 accent-[#B8F527]" />
            </label>
            <label class="flex items-center justify-between gap-3 cursor-pointer">
              <span class="text-sm text-zinc-800 dark:text-zinc-200">Hydration &amp; Recovery Prompts</span>
              <input type="checkbox" data-pref="hydrationAlerts" ${prefs.hydrationAlerts ? 'checked' : ''} class="w-4 h-4 accent-[#B8F527]" />
            </label>
            <label class="flex items-center justify-between gap-3 cursor-pointer">
              <span class="text-sm text-zinc-800 dark:text-zinc-200">Weekly Nutrition Summary</span>
              <input type="checkbox" data-pref="weeklySummary" ${prefs.weeklySummary ? 'checked' : ''} class="w-4 h-4 accent-[#B8F527]" />
            </label>
            <label class="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <span class="block text-sm text-zinc-800 dark:text-zinc-200">Browser Push Alerts</span>
                <span class="block text-[11px] text-zinc-500 dark:text-zinc-400">${pushHint}</span>
              </div>
              <input type="checkbox" data-pref-push="browserPushEnabled" ${prefs.browserPushEnabled ? 'checked' : ''} class="w-4 h-4 accent-[#B8F527]" />
            </label>
            <label class="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <span class="block text-sm text-zinc-800 dark:text-zinc-200">Notification Sound &amp; Vibration</span>
                <span class="block text-[11px] text-zinc-500 dark:text-zinc-400">Subtle chime &amp; 200ms haptic pulse</span>
              </div>
              <input type="checkbox" data-pref="soundVibrationEnabled" ${prefs.soundVibrationEnabled ? 'checked' : ''} class="w-4 h-4 accent-[#B8F527]" />
            </label>

            <div class="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#17191E] border border-zinc-200 dark:border-[#24272F] space-y-2.5">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-xs font-semibold text-zinc-900 dark:text-white">Daily Hydration Tracker</p>
                  <p class="text-[11px] text-zinc-500 dark:text-zinc-400">Stay hydrated outside quiet hours</p>
                </div>
                <span data-hydration-count class="font-mono-num text-xs font-bold text-[#658C0A] dark:text-[#B8F527]">${glasses}/${goalGlasses} glasses</span>
              </div>
              <div class="grid grid-cols-8 gap-1.5" aria-hidden="true">${waterSegments}</div>
              <div class="flex items-center justify-between gap-2 pt-0.5">
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-action="add-water-glass"
                    class="px-3 py-1.5 rounded-xl bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-xs font-bold transition-colors"
                  >+1 Glass</button>
                  <button
                    type="button"
                    data-action="remove-water-glass"
                    ${glasses <= 0 ? 'disabled' : ''}
                    aria-label="Remove one glass"
                    class="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-[#2B2E36] text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:border-zinc-400 disabled:opacity-40 disabled:pointer-events-none"
                  >-1</button>
                </div>
                <label class="flex items-center gap-2 cursor-pointer">
                  <span class="text-xs text-zinc-700 dark:text-zinc-300">Remind every 2 hours</span>
                  <input type="checkbox" data-pref="hydrationIntervalEnabled" ${prefs.hydrationIntervalEnabled ? 'checked' : ''} class="w-4 h-4 accent-[#B8F527]" />
                </label>
              </div>
            </div>

            <div class="pt-2 space-y-2">
              <p class="text-xs font-medium text-zinc-600 dark:text-zinc-400">Reminder Schedule</p>
              <div class="grid grid-cols-2 gap-2.5">
                ${Object.entries(prefs.mealTimes || {})
                  .map(
                    ([slot, val]) => `
                  <label class="text-xs text-zinc-500 dark:text-zinc-400 flex flex-col gap-1">
                    <span>${slot}</span>
                    <input type="time" data-meal-time="${slot}" value="${val}" class="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#1B1D22] border border-zinc-200 dark:border-[#2B2E36] text-zinc-900 dark:text-white font-mono-num text-xs" />
                  </label>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="pt-2 space-y-2.5">
              <label class="flex items-center justify-between gap-3 cursor-pointer">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-zinc-800 dark:text-zinc-200">Quiet Hours</span>
                  ${
                    quietNow
                      ? '<span class="text-[10px] font-semibold text-amber-500 dark:text-amber-300">Active now</span>'
                      : ''
                  }
                </div>
                <input type="checkbox" data-pref="quietHoursEnabled" ${prefs.quietHoursEnabled ? 'checked' : ''} class="w-4 h-4 accent-[#B8F527]" />
              </label>
              <div class="grid grid-cols-2 gap-2.5 ${prefs.quietHoursEnabled ? '' : 'opacity-45 pointer-events-none'}">
                <label class="text-xs text-zinc-500 dark:text-zinc-400 flex flex-col gap-1">
                  <span>Start</span>
                  <input type="time" data-quiet="quietStart" value="${prefs.quietStart}" class="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#1B1D22] border border-zinc-200 dark:border-[#2B2E36] text-zinc-900 dark:text-white font-mono-num text-xs" />
                </label>
                <label class="text-xs text-zinc-500 dark:text-zinc-400 flex flex-col gap-1">
                  <span>End</span>
                  <input type="time" data-quiet="quietEnd" value="${prefs.quietEnd}" class="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#1B1D22] border border-zinc-200 dark:border-[#2B2E36] text-zinc-900 dark:text-white font-mono-num text-xs" />
                </label>
              </div>
            </div>
          </section>

          <section class="pt-4 border-t border-zinc-200 dark:border-[#23262E] space-y-2.5">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Recent Feed</h3>
              <span class="text-[11px] font-mono-num text-zinc-400">${state.notifications.length} item${state.notifications.length === 1 ? '' : 's'}</span>
            </div>
            <div class="space-y-2.5">${listHtml}</div>
          </section>
        </div>
      </div>
    </div>
  `;
}

export function bindModalsAndAssistantEvents(root) {
  const closeAuth = () => {
    store.setUI({ authModalOpen: false, authPrefillEmail: '', authSuccessMessage: '' });
    if (window.location.pathname === '/login') {
      window.history.replaceState(null, '', '/');
    }
  };

  root.querySelectorAll('[data-action="close-auth"]').forEach((el) =>
    el.addEventListener('click', closeAuth)
  );
  root.querySelector('#auth-modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal-backdrop') closeAuth();
  });
  root.querySelectorAll('[data-auth-tab]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const nextTab = btn.getAttribute('data-auth-tab');
      store.setUI({
        authModalTab: nextTab,
        ...(nextTab === 'signup' ? { authSuccessMessage: '' } : {}),
      });
    })
  );
  root.querySelector('[data-action="modal-demo-signin"]')?.addEventListener('click', () => {
    store.demoSignIn();
    if (window.location.pathname === '/login') {
      window.history.replaceState(null, '', '/');
    }
    store.setView('myfoods');
    showToast('Signed in to Demo Profile');
  });
  root.querySelector('[data-action="google-signin"]')?.addEventListener('click', () => {
    store.demoSignIn({ name: 'Alex Mercer', email: 'alex.google@nutrisense.demo' });
    if (window.location.pathname === '/login') {
      window.history.replaceState(null, '', '/');
    }
    store.setView('myfoods');
    showToast('Signed in with Google Demo');
  });

  root.querySelector('#auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value;
    const fullName = form.name?.value?.trim() || '';
    const errEl = root.querySelector('#auth-error');
    const noticeEl = root.querySelector('#auth-notice');
    const submitBtn = form.querySelector('button[type="submit"]');
    const isSignup = store.getUI().authModalTab === 'signup';

    if (noticeEl) {
      noticeEl.classList.add('hidden');
      noticeEl.textContent = '';
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (isSignup && fullName.length < 2) {
      errEl.textContent = 'Please enter your name (at least 2 characters).';
      errEl.classList.remove('hidden');
      return;
    }
    if (!emailValid) {
      errEl.textContent = 'Please enter a valid email address.';
      errEl.classList.remove('hidden');
      return;
    }
    if (password.length < 6) {
      errEl.textContent = 'Password must be at least 6 characters.';
      errEl.classList.remove('hidden');
      return;
    }

    errEl.classList.add('hidden');
    errEl.textContent = '';

    const originalLabel = submitBtn?.textContent || '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isSignup ? 'Creating Account...' : 'Signing In...';
    }

    try {
      const { data, error } = isSignup
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
            },
          })
        : await supabase.auth.signInWithPassword({
            email,
            password,
          });

      if (error) {
        errEl.textContent = error.message || 'Authentication failed. Please try again.';
        errEl.classList.remove('hidden');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
        return;
      }

      if (isSignup) {
        if (data?.session) {
          await supabase.auth.signOut().catch(() => {});
        }
        const successMessage =
          'Your account has been created. Please check your email and verify your address before logging in.';
        const loginUrl = `/login?signup=success&email=${encodeURIComponent(email)}`;
        window.history.pushState({ fromSignup: true, email }, '', loginUrl);
        store.setUI({
          authModalOpen: true,
          authModalTab: 'login',
          authPrefillEmail: email,
          authSuccessMessage: successMessage,
        });
        return;
      }

      if (!data?.session) {
        errEl.textContent = 'No active session found. Please confirm your email before logging in.';
        errEl.classList.remove('hidden');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
        return;
      }

      const user = data.session.user || data.user;
      await store.hydrateFromSupabase(user, { force: true });

      if (window.location.pathname !== '/' || window.location.search) {
        window.history.pushState(null, '', '/');
      }
      store.setView('home');
      showToast('Signed in successfully');
    } catch (err) {
      errEl.textContent = err?.message || 'Unable to connect to authentication service.';
      errEl.classList.remove('hidden');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    }
  });

  // One-Time Profile Setup Modal
  const closeProfileSetup = () => {
    setupDraftBio = null;
    setupDraftConditions = null;
    setupDraftAllergies = null;
    setupDraftUserId = null;
    setupIsSaving = false;
    store.dismissProfileSetupModal();
  };

  root.querySelectorAll('[data-action="close-profile-setup"]').forEach((el) =>
    el.addEventListener('click', closeProfileSetup)
  );

  const bindProfileSetupFormEvents = () => {
    const formEl = root.querySelector('#profile-setup-form');
    if (!formEl) return;

    const refreshSetupForm = () => {
      formEl.innerHTML = renderProfileFormFieldsHTML({
        prefix: 'setup',
        draftBio: setupDraftBio,
        draftConditions: setupDraftConditions,
        draftAllergies: setupDraftAllergies,
        resetAction: 'reset-profile-setup',
        isSaving: setupIsSaving,
      });
      bindProfileSetupFormEvents();
    };

    const ageInput = formEl.querySelector('#setup-age');
    ageInput?.addEventListener('input', () => {
      setupDraftBio.age = Math.max(13, Math.min(100, Number(ageInput.value) || 28));
    });

    formEl.querySelectorAll('[data-setup-gender]').forEach((btn) =>
      btn.addEventListener('click', () => {
        setupDraftBio.gender = btn.getAttribute('data-setup-gender');
        refreshSetupForm();
      })
    );

    formEl.querySelectorAll('[data-setup-height-unit]').forEach((btn) =>
      btn.addEventListener('click', () => {
        setupDraftBio.heightUnit = btn.getAttribute('data-setup-height-unit');
        refreshSetupForm();
      })
    );

    formEl.querySelectorAll('[data-setup-weight-unit]').forEach((btn) =>
      btn.addEventListener('click', () => {
        setupDraftBio.weightUnit = btn.getAttribute('data-setup-weight-unit');
        refreshSetupForm();
      })
    );

    formEl.querySelector('#setup-height-cm')?.addEventListener('input', (e) => {
      setupDraftBio.heightCm = Math.max(100, Math.min(240, Number(e.target.value) || 170));
    });

    const syncSetupFtIn = () => {
      const ft = Number(formEl.querySelector('#setup-height-ft')?.value) || 5;
      const inch = Number(formEl.querySelector('#setup-height-in')?.value) || 0;
      setupDraftBio.heightCm = ftInToCm(ft, inch);
    };
    formEl.querySelector('#setup-height-ft')?.addEventListener('input', syncSetupFtIn);
    formEl.querySelector('#setup-height-in')?.addEventListener('input', syncSetupFtIn);

    formEl.querySelector('#setup-weight')?.addEventListener('input', (e) => {
      const val = Number(e.target.value) || 70;
      setupDraftBio.weightKg = setupDraftBio.weightUnit === 'kg' ? val : lbToKg(val);
    });

    formEl.querySelector('#setup-job')?.addEventListener('change', (e) => {
      setupDraftBio.jobType = e.target.value;
    });

    formEl.querySelector('#setup-activity')?.addEventListener('change', (e) => {
      setupDraftBio.activityLevel = e.target.value;
    });

    formEl.querySelectorAll('[data-setup-goal]').forEach((btn) =>
      btn.addEventListener('click', () => {
        setupDraftBio.goal = btn.getAttribute('data-setup-goal');
        refreshSetupForm();
      })
    );

    formEl.querySelectorAll('[data-setup-condition]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const cond = btn.getAttribute('data-setup-condition');
        if (setupDraftConditions.includes(cond)) {
          setupDraftConditions = setupDraftConditions.filter((c) => c !== cond);
        } else {
          setupDraftConditions = [...setupDraftConditions, cond];
        }
        refreshSetupForm();
      })
    );

    formEl.querySelectorAll('[data-setup-allergy]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const alg = btn.getAttribute('data-setup-allergy');
        if (setupDraftAllergies.includes(alg)) {
          setupDraftAllergies = setupDraftAllergies.filter((a) => a !== alg);
        } else {
          setupDraftAllergies = [...setupDraftAllergies, alg];
        }
        refreshSetupForm();
      })
    );

    formEl.querySelector('[data-action="reset-profile-setup"]')?.addEventListener('click', () => {
      ensureSetupDraft(store.getState(), true);
      refreshSetupForm();
      showToast('Reset form to saved defaults');
    });
  };

  const setupForm = root.querySelector('#profile-setup-form');
  if (setupForm) {
    bindProfileSetupFormEvents();
    setupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (setupIsSaving) return;
      setupIsSaving = true;
      const submitBtn = setupForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        const label = submitBtn.querySelector('span');
        if (label) label.textContent = 'Saving Profile...';
      }

      const result = await store.saveProfileAndTargets({
        biometrics: setupDraftBio,
        healthConditions: setupDraftConditions,
        allergies: setupDraftAllergies,
      });

      setupIsSaving = false;
      if (result?.ok !== false) {
        setupDraftBio = null;
        setupDraftConditions = null;
        setupDraftAllergies = null;
        setupDraftUserId = null;
        showToast('Saved targets to your profile & synced meal plan');
      } else if (submitBtn) {
        submitBtn.disabled = false;
        const label = submitBtn.querySelector('span');
        if (label) label.textContent = 'Save to Profile';
      }
    });
  }

  // Notifications Drawer
  root.querySelectorAll('[data-action="close-notifications"]').forEach((el) =>
    el.addEventListener('click', () => store.setUI({ notificationsOpen: false }))
  );
  root.querySelector('#notifications-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'notifications-backdrop') store.setUI({ notificationsOpen: false });
  });
  root.querySelector('[data-action="mark-all-read"]')?.addEventListener('click', () => {
    store.markAllNotificationsRead();
    showToast('All notifications marked as read');
  });
  root.querySelector('[data-action="clear-all-notifications"]')?.addEventListener('click', () => {
    store.clearAllNotifications();
    showToast('All notifications cleared');
  });
  root.querySelectorAll('[data-action="delete-notification"]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-notif-id');
      store.deleteNotification(id);
      showToast('Notification removed');
    })
  );
  root.querySelector('[data-action="add-water-glass"]')?.addEventListener('click', () => {
    store.addWaterGlass(1);
    const { glasses, goalGlasses } = store.getState().hydration || { glasses: 0, goalGlasses: 8 };
    showToast(`Logged water intake (${glasses}/${goalGlasses} glasses)`);
  });
  root.querySelector('[data-action="remove-water-glass"]')?.addEventListener('click', () => {
    store.addWaterGlass(-1);
  });
  root.querySelector('[data-pref-push]')?.addEventListener('change', async (e) => {
    const input = e.currentTarget;
    if (!input.checked) {
      store.updateNotificationPrefs({ browserPushEnabled: false });
      showToast('Browser push alerts disabled');
      return;
    }
    const perm = await requestBrowserNotificationPermission();
    if (perm === 'granted') {
      store.updateNotificationPrefs({ browserPushEnabled: true });
      showToast('Browser push alerts enabled');
    } else {
      input.checked = false;
      store.updateNotificationPrefs({ browserPushEnabled: false });
      showToast(
        perm === 'unsupported'
          ? 'Browser notifications are not supported here'
          : 'Browser notification permission was denied',
        'error'
      );
    }
  });
  root.querySelectorAll('[data-pref]').forEach((input) =>
    input.addEventListener('change', () => {
      const prefKey = input.getAttribute('data-pref');
      store.updateNotificationPrefs({ [prefKey]: input.checked });
      if (prefKey === 'soundVibrationEnabled' && input.checked) {
        playNotificationChime();
        triggerNotificationVibration(200);
      }
      showToast('Notification preference updated');
    })
  );
  root.querySelectorAll('[data-meal-time]').forEach((input) =>
    input.addEventListener('change', () => {
      const slot = input.getAttribute('data-meal-time');
      store.updateNotificationPrefs({ mealTimes: { [slot]: input.value } });
      showToast(`${slot} reminder set to ${input.value}`);
    })
  );
  root.querySelectorAll('[data-quiet]').forEach((input) =>
    input.addEventListener('change', () => {
      store.updateNotificationPrefs({ [input.getAttribute('data-quiet')]: input.value });
    })
  );

  // Agentic RAG AI Copilot
  bindRagChatbotEvents(root);
}

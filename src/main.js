import { store } from './state/store.js';
import { renderHeaderNav, bindHeaderNavEvents } from './components/headerNav.js';
import {
  renderModalsAndAssistant,
  bindModalsAndAssistantEvents,
} from './components/modals.js';
import { renderHomeView, bindHomeViewEvents } from './views/homeView.js';
import { renderCalculatorView, bindCalculatorViewEvents } from './views/calculatorView.js';
import { renderPlannerView, bindPlannerViewEvents } from './views/plannerView.js';
import { renderScannerView, bindScannerViewEvents } from './views/scannerView.js';
import { renderMyFoodsView, bindMyFoodsViewEvents } from './views/myFoodsView.js';
import { renderDocsView, bindDocsViewEvents } from './views/docsView.js';
import { supabase } from './supabaseClient.js';

const appRoot = document.getElementById('app');

function syncDocumentTheme(theme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

function renderApp() {
  if (!appRoot) return;
  const state = store.getState();
  const ui = store.getUI();

  syncDocumentTheme(state.theme);

  let viewHtml = '';
  switch (state.activeView) {
    case 'calculator':
      viewHtml = renderCalculatorView(state, ui);
      break;
    case 'planner':
      viewHtml = renderPlannerView(state, ui);
      break;
    case 'scanner':
      viewHtml = renderScannerView(state, ui);
      break;
    case 'myfoods':
      viewHtml = renderMyFoodsView(state, ui);
      break;
    case 'docs':
      viewHtml = renderDocsView(state, ui);
      break;
    case 'home':
    default:
      viewHtml = renderHomeView(state, ui);
      break;
  }

  appRoot.innerHTML = `
    <div class="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 dark:bg-[#090A0C] dark:text-zinc-100 pb-24 md:pb-10 transition-colors duration-150">
      ${renderHeaderNav(state)}

      <main id="main-content" class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-8">
        ${viewHtml}
      </main>

      <footer class="print:hidden w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-8 border-t border-zinc-200 dark:border-[#1E2127] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <div class="flex flex-wrap items-center gap-3">
          <p>NutriSense · Personalized Nutrition &amp; Adaptive Diet Prototype</p>
          <span aria-hidden="true">·</span>
          <button type="button" data-nav="docs" class="font-medium text-zinc-700 dark:text-zinc-300 hover:text-[#658C0A] dark:hover:text-[#B8F527] underline underline-offset-4 transition-colors">
            Docs &amp; Pitch Deck (/docs)
          </button>
        </div>
        <p>Nutrition values are approximate. Wellness adaptations are informational and not medical advice.</p>
      </footer>

      ${renderModalsAndAssistant(state, ui)}
    </div>
  `;

  bindHeaderNavEvents(appRoot);
  bindModalsAndAssistantEvents(appRoot);

  switch (state.activeView) {
    case 'calculator':
      bindCalculatorViewEvents(appRoot, renderApp);
      break;
    case 'planner':
      bindPlannerViewEvents(appRoot);
      break;
    case 'scanner':
      bindScannerViewEvents(appRoot);
      break;
    case 'myfoods':
      bindMyFoodsViewEvents(appRoot);
      break;
    case 'docs':
      bindDocsViewEvents(appRoot, renderApp);
      break;
    case 'home':
    default:
      bindHomeViewEvents(appRoot);
      break;
  }
}

// Support ?autostart=1, ?view=..., /login, and /myfoods paths
const params = new URLSearchParams(window.location.search);
const pathname = window.location.pathname;

if (params.get('autostart') === '1') {
  store.demoSignIn();
  store.setState({ activeView: 'myfoods' });
} else if (pathname === '/login') {
  const prefillEmail = params.get('email') || '';
  const fromSignup = params.get('signup') === 'success';
  store.setState({ activeView: 'home' });
  store.setUI({
    authModalOpen: true,
    authModalTab: 'login',
    authPrefillEmail: prefillEmail,
    authSuccessMessage: fromSignup
      ? 'Your account has been created. Please check your email and verify your address before logging in.'
      : '',
  });
} else if (pathname === '/docs') {
  store.setState({ activeView: 'docs' });
} else {
  const requestedView = params.get('view') || (pathname === '/myfoods' ? 'myfoods' : null);
  if (requestedView && ['home', 'calculator', 'planner', 'scanner', 'myfoods', 'docs'].includes(requestedView)) {
    if (requestedView === 'myfoods') {
      store.setView('myfoods');
    } else {
      store.setState({ activeView: requestedView });
    }
  }
}

async function initSupabaseSessionGuard() {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session || null;
    await store.syncFromSupabaseSession(session);

    if (store.getState().activeView === 'myfoods' && !session && !store.getState().isDemoMode) {
      window.history.pushState(null, '', '/login');
      store.setState({ isAuthenticated: false, authUserId: null, activeView: 'home' });
      store.setUI({ authModalOpen: true, authModalTab: 'login' });
    }
  } catch {
    // Keep existing local state if network check fails
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    store.syncFromSupabaseSession(session);
  });
}

window.addEventListener('popstate', () => {
  if (window.location.pathname === '/login') {
    const loginParams = new URLSearchParams(window.location.search);
    store.setUI({
      authModalOpen: true,
      authModalTab: 'login',
      authPrefillEmail: loginParams.get('email') || '',
      authSuccessMessage:
        loginParams.get('signup') === 'success'
          ? 'Your account has been created. Please check your email and verify your address before logging in.'
          : '',
    });
  } else if (window.location.pathname === '/myfoods') {
    store.setView('myfoods');
  } else if (window.location.pathname === '/docs') {
    store.setState({ activeView: 'docs' });
  } else {
    store.setUI({ authModalOpen: false, authPrefillEmail: '', authSuccessMessage: '' });
    if (store.getState().activeView === 'docs') {
      store.setState({ activeView: 'home' });
    }
  }
});

// Keyboard accessibility: Escape closes open dialogs
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const ui = store.getUI();
    if (ui.profileSetupModalOpen) {
      store.dismissProfileSetupModal();
    }
    if (ui.authModalOpen || ui.notificationsOpen || ui.chatOpen) {
      store.setUI({
        authModalOpen: false,
        authPrefillEmail: '',
        authSuccessMessage: '',
        notificationsOpen: false,
        chatOpen: false,
      });
      if (window.location.pathname === '/login') {
        window.history.replaceState(null, '', '/');
      }
    }
  }
});

store.subscribe(renderApp);
renderApp();
initSupabaseSessionGuard();

if (typeof window !== 'undefined') {
  store.checkScheduledReminders();
  window.setInterval(() => {
    store.checkScheduledReminders();
  }, 30000);
}

// src/components/ragChatbot.js
// Competition-Ready Agentic RAG Chatbot UI with System Control chips, PDF download cards & RAG citations

import { icon } from './icons.js';
import { store } from '../state/store.js';
import { ASSISTANT_QUICK_REPLIES } from '../services/ragChatbotService.js';
import { exportNutriSensePDF } from '../services/pdfExportService.js';
import { showToast } from './toast.js';

// Preserve user's unsent text across full-app re-renders (e.g. 30s reminder timer)
let chatInputDraft = '';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Safe lightweight Markdown renderer (bold, italic, inline code, bullets, line breaks)
 */
function formatChatMarkdown(rawText) {
  const escaped = escapeHtml(rawText || '');
  const lines = escaped.split('\n');
  const htmlParts = [];
  let inList = false;

  const formatInline = (str) =>
    str
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-zinc-950 dark:text-white">$1</strong>')
      .replace(/_(.+?)_/g, '<em class="opacity-80">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[10px]">$1</code>');

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (/^[-*•]\s+/.test(trimmed)) {
      if (!inList) {
        htmlParts.push('<ul class="list-disc pl-4 my-1.5 space-y-1">');
        inList = true;
      }
      htmlParts.push(`<li>${formatInline(trimmed.replace(/^[-*•]\s+/, ''))}</li>`);
    } else {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      if (trimmed === '') {
        htmlParts.push('<div class="h-1.5"></div>');
      } else {
        htmlParts.push(`<p class="leading-relaxed">${formatInline(trimmed)}</p>`);
      }
    }
  });

  if (inList) htmlParts.push('</ul>');
  return htmlParts.join('');
}

function renderMessageExtras(msg) {
  const meta = msg?.meta;
  if (!meta || msg.role !== 'assistant') return '';

  const actionsHtml =
    Array.isArray(meta.actionsExecuted) && meta.actionsExecuted.length > 0
      ? `
        <div class="mt-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-700/60 flex flex-wrap gap-1.5">
          ${meta.actionsExecuted
            .map(
              (act) => `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#B8F527]/20 text-[#4d6b05] dark:text-[#B8F527] text-[10px] font-semibold">
                <span>⚡</span>
                <span>${escapeHtml(act)}</span>
              </span>
            `
            )
            .join('')}
        </div>
      `
      : '';

  const pdfHtml = meta.pdfAction
    ? `
      <div class="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-[#14161A] border border-[#B8F527]/50 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p class="text-[11px] font-bold text-zinc-900 dark:text-white truncate">${escapeHtml(meta.pdfAction.title)}</p>
          <p class="text-[10px] text-zinc-500 dark:text-zinc-400">Ready to save or print (A4 PDF)</p>
        </div>
        <button
          type="button"
          data-chat-pdf="${escapeHtml(meta.pdfAction.reportType)}"
          class="px-2.5 py-1.5 rounded-lg bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-[10px] font-bold whitespace-nowrap shrink-0 transition-colors"
        >Download PDF</button>
      </div>
    `
    : '';

  const sourcesHtml =
    Array.isArray(meta.sources) && meta.sources.length > 0
      ? `
        <details class="mt-2 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/50 text-[10px] text-zinc-500 dark:text-zinc-400">
          <summary class="cursor-pointer select-none font-medium hover:text-zinc-800 dark:hover:text-zinc-200">
            RAG Sources (${meta.sources.length} chunks · ${escapeHtml(meta.mode || 'rag')})
          </summary>
          <div class="mt-1.5 flex flex-wrap gap-1">
            ${meta.sources
              .map(
                (s) => `
                <span class="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-[#272B33] text-zinc-700 dark:text-zinc-300 text-[9.5px]" title="${escapeHtml(s.category)}">
                  [${escapeHtml(s.ref)}] ${escapeHtml(s.title)}
                </span>
              `
              )
              .join('')}
          </div>
        </details>
      `
      : '';

  return `${actionsHtml}${pdfHtml}${sourcesHtml}`;
}

export function renderRagChatbot(state, ui) {
  const isExpanded = Boolean(ui.chatExpanded);
  const panelSizeClass = isExpanded
    ? 'w-[calc(100vw-2rem)] sm:w-[540px] max-h-[84vh]'
    : 'w-[calc(100vw-2rem)] sm:w-[410px] max-h-[76vh]';
  const scrollHeightClass = isExpanded ? 'min-h-[320px] max-h-[52vh]' : 'min-h-[240px] max-h-[360px]';

  const chatMessages = (state.chatHistory || [])
    .map((msg) => {
      const isUser = msg.role === 'user';
      return `
        <div class="flex flex-col ${isUser ? 'items-end' : 'items-start'}">
          <div class="max-w-[90%] px-3.5 py-2.5 rounded-2xl text-xs ${
            isUser
              ? 'bg-[#B8F527] text-zinc-950 font-medium rounded-br-sm'
              : 'bg-zinc-100 dark:bg-[#1E2127] text-zinc-800 dark:text-zinc-200 rounded-bl-sm border border-zinc-200/70 dark:border-[#2B2F39]'
          }">
            ${isUser ? `<p class="leading-relaxed">${escapeHtml(msg.text)}</p>` : formatChatMarkdown(msg.text)}
            ${renderMessageExtras(msg)}
          </div>
          <span class="mt-1 text-[10px] text-zinc-400 px-1">${escapeHtml(msg.timeLabel || '')}</span>
        </div>
      `;
    })
    .join('');

  const typingHtml = ui.chatTyping
    ? `
      <div class="flex items-start">
        <div class="px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-[#1E2127] border border-zinc-200/70 dark:border-[#2B2F39] text-zinc-500 dark:text-zinc-400 text-xs flex items-center gap-2">
          <span>Retrieving RAG context &amp; running tools</span>
          <span class="inline-flex gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-[#B8F527] animate-bounce"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#B8F527] animate-bounce" style="animation-delay:0.12s"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#B8F527] animate-bounce" style="animation-delay:0.24s"></span>
          </span>
        </div>
      </div>
    `
    : '';

  return `
    <div class="fixed bottom-[76px] md:bottom-6 right-4 md:right-6 z-40 flex flex-col items-end gap-3">
      ${
        ui.chatOpen
          ? `
        <div
          id="assistant-panel"
          class="${panelSizeClass} rounded-3xl bg-white dark:bg-[#14161A] border border-zinc-200 dark:border-[#282B33] shadow-2xl flex flex-col overflow-hidden transition-all duration-150"
          role="dialog"
          aria-label="NutriSense RAG AI Copilot"
        >
          <!-- Header -->
          <div class="px-4 py-3 bg-zinc-50 dark:bg-[#191C22] border-b border-zinc-200 dark:border-[#262932] flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-display text-sm font-bold text-zinc-950 dark:text-white truncate">NutriSense AI Copilot</h3>
                <span class="px-1.5 py-0.5 rounded-md bg-[#B8F527]/20 text-[#4d6b05] dark:text-[#B8F527] text-[9.5px] font-bold uppercase tracking-wider">RAG + Control</span>
              </div>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">Ask nutrition, control app, or export PDFs</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                data-action="toggle-chat-expand"
                title="${isExpanded ? 'Compact size' : 'Expand panel'}"
                class="px-2 h-8 rounded-lg bg-zinc-200/70 dark:bg-[#242830] text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
              >${isExpanded ? 'Compact' : 'Expand'}</button>
              <button
                type="button"
                data-action="clear-chat"
                title="Clear chat history"
                class="px-2 h-8 rounded-lg bg-zinc-200/70 dark:bg-[#242830] text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-rose-500"
              >Reset</button>
              <button
                type="button"
                data-action="close-chat"
                aria-label="Close AI Copilot"
                class="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-200/70 dark:bg-[#242830] text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
              >${icon('x', 'w-4 h-4')}</button>
            </div>
          </div>

          <!-- Instant PDF Export Bar -->
          <div class="px-3.5 py-2 bg-zinc-100/70 dark:bg-[#16191F] border-b border-zinc-200 dark:border-[#23262E] flex items-center gap-1.5 overflow-x-auto">
            <span class="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 shrink-0 mr-1">Export PDF:</span>
            <button
              type="button"
              data-chat-pdf="meal_plan"
              class="px-2.5 py-1 rounded-lg bg-white dark:bg-[#20242C] border border-zinc-200 dark:border-[#2E333E] hover:border-[#B8F527] text-[10.5px] font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap shrink-0 transition-colors"
            >📄 Meal Plan</button>
            <button
              type="button"
              data-chat-pdf="food_logs"
              class="px-2.5 py-1 rounded-lg bg-white dark:bg-[#20242C] border border-zinc-200 dark:border-[#2E333E] hover:border-[#B8F527] text-[10.5px] font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap shrink-0 transition-colors"
            >📄 Food Logs</button>
            <button
              type="button"
              data-chat-pdf="full_report"
              class="px-2.5 py-1 rounded-lg bg-[#B8F527]/15 border border-[#B8F527]/40 hover:bg-[#B8F527]/25 text-[10.5px] font-semibold text-zinc-900 dark:text-[#B8F527] whitespace-nowrap shrink-0 transition-colors"
            >📄 Full Report</button>
          </div>

          <!-- Messages -->
          <div id="chat-scroll-body" class="flex-1 overflow-y-auto p-4 space-y-3 ${scrollHeightClass}">
            ${chatMessages}
            ${typingHtml}
          </div>

          <!-- Quick Prompts -->
          <div class="px-3.5 py-2 border-t border-zinc-200 dark:border-[#23262E] flex gap-1.5 overflow-x-auto">
            ${ASSISTANT_QUICK_REPLIES.map(
              (q) => `
              <button
                type="button"
                data-quick-reply="${escapeHtml(q)}"
                class="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#1D2026] hover:bg-zinc-200 dark:hover:bg-[#262A32] text-[11px] font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0 transition-colors"
              >${escapeHtml(q)}</button>
            `
            ).join('')}
          </div>

          <!-- Input Form -->
          <form id="assistant-form" class="p-3 border-t border-zinc-200 dark:border-[#23262E] flex items-center gap-2">
            <label for="assistant-input" class="sr-only">Ask NutriSense AI Copilot</label>
            <input
              id="assistant-input"
              type="text"
              value="${escapeHtml(chatInputDraft)}"
              placeholder="Ask nutrition, control app, or export PDF..."
              ${ui.chatTyping ? 'disabled' : ''}
              class="flex-1 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-[#1C1F25] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#B8F527] disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send message"
              ${ui.chatTyping ? 'disabled' : ''}
              class="w-9 h-9 rounded-xl bg-[#B8F527] hover:bg-[#A8E51B] disabled:opacity-50 text-zinc-950 flex items-center justify-center shrink-0 transition-colors"
            >${icon('send', 'w-4 h-4')}</button>
          </form>
        </div>
      `
          : ''
      }

      <button
        type="button"
        data-action="toggle-chat"
        aria-label="${ui.chatOpen ? 'Minimize AI Copilot' : 'Open AI Copilot'}"
        class="h-11 px-3.5 sm:px-4 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 font-semibold text-xs shadow-xl ring-4 ring-zinc-50 dark:ring-[#090A0C] flex items-center gap-2 transition-transform active:scale-95"
      >
        ${icon('message', 'w-4 h-4')}
        <span class="hidden sm:inline">NutriSense AI Copilot</span>
      </button>
    </div>
  `;
}

export function bindRagChatbotEvents(root) {
  root.querySelector('[data-action="toggle-chat"]')?.addEventListener('click', () => {
    store.setUI({ chatOpen: !store.getUI().chatOpen });
  });

  root.querySelector('[data-action="close-chat"]')?.addEventListener('click', () => {
    store.setUI({ chatOpen: false });
  });

  root.querySelector('[data-action="toggle-chat-expand"]')?.addEventListener('click', () => {
    store.setUI({ chatExpanded: !store.getUI().chatExpanded });
  });

  root.querySelector('[data-action="clear-chat"]')?.addEventListener('click', () => {
    chatInputDraft = '';
    store.clearChatHistory();
    showToast('Chat conversation reset');
  });

  root.querySelectorAll('[data-chat-pdf]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const reportType = btn.getAttribute('data-chat-pdf') || 'full_report';
      const res = exportNutriSensePDF(reportType, store.getState());
      if (res.ok) {
        showToast(`Preparing PDF: ${res.title}`);
      } else {
        showToast(res.error || 'PDF export failed', 'error');
      }
    })
  );

  root.querySelectorAll('[data-quick-reply]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (store.getUI().chatTyping) return;
      store.sendChatMessage(btn.getAttribute('data-quick-reply'));
    })
  );

  const input = root.querySelector('#assistant-input');
  input?.addEventListener('input', (e) => {
    chatInputDraft = e.target.value;
  });

  root.querySelector('#assistant-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (store.getUI().chatTyping) return;
    const text = (input?.value || '').trim();
    if (text) {
      chatInputDraft = '';
      store.sendChatMessage(text);
    }
  });

  const scrollBody = root.querySelector('#chat-scroll-body');
  if (scrollBody) {
    scrollBody.scrollTop = scrollBody.scrollHeight;
  }
}

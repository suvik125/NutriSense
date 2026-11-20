import { DEFAULT_DOCS_ACCESS, DEFAULT_DOCS_CONTENT } from '../data/docsDefaults.js';

const DOCS_CONTENT_KEY = 'nutrisense_docs_content_v1';
const DOCS_ACCESS_KEY = 'nutrisense_docs_access_v1';
const DOCS_ADMIN_SESSION_KEY = 'nutrisense_docs_admin_v1';
const ADMIN_PASSCODE = 'DIU2026';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function readStorage(key, fallback) {
  if (typeof localStorage === 'undefined') return clone(fallback);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return clone(fallback);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function writeStorage(key, value) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getDocsContent() {
  const stored = readStorage(DOCS_CONTENT_KEY, DEFAULT_DOCS_CONTENT);
  return {
    meta: { ...DEFAULT_DOCS_CONTENT.meta, ...(stored.meta || {}) },
    pitch: {
      slides:
        Array.isArray(stored.pitch?.slides) && stored.pitch.slides.length > 0
          ? stored.pitch.slides
          : clone(DEFAULT_DOCS_CONTENT.pitch.slides),
    },
    team:
      Array.isArray(stored.team) && stored.team.length > 0
        ? stored.team
        : clone(DEFAULT_DOCS_CONTENT.team),
    features:
      Array.isArray(stored.features) && stored.features.length > 0
        ? stored.features
        : clone(DEFAULT_DOCS_CONTENT.features),
    techStack:
      Array.isArray(stored.techStack) && stored.techStack.length > 0
        ? stored.techStack
        : clone(DEFAULT_DOCS_CONTENT.techStack),
    technicalSections: {
      ...DEFAULT_DOCS_CONTENT.technicalSections,
      ...(stored.technicalSections || {}),
    },
    updatedAt: stored.updatedAt || null,
  };
}

export function saveDocsContent(nextContent) {
  const payload = {
    ...nextContent,
    updatedAt: new Date().toISOString(),
  };
  writeStorage(DOCS_CONTENT_KEY, payload);
  return payload;
}

export function resetDocsContent() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(DOCS_CONTENT_KEY);
    } catch {
      // Ignore storage error
    }
  }
  return clone(DEFAULT_DOCS_CONTENT);
}

export function getDocsAccessConfig() {
  const stored = readStorage(DOCS_ACCESS_KEY, DEFAULT_DOCS_ACCESS);
  return {
    ...DEFAULT_DOCS_ACCESS,
    ...stored,
  };
}

export function saveDocsAccessConfig(nextConfig) {
  const merged = {
    ...DEFAULT_DOCS_ACCESS,
    ...nextConfig,
    updatedAt: new Date().toISOString(),
  };
  writeStorage(DOCS_ACCESS_KEY, merged);
  return merged;
}

export function isDocsAdminUnlocked() {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(DOCS_ADMIN_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function verifyDocsAdminPasscode(passcode) {
  const normalized = String(passcode || '').trim().toUpperCase();
  if (normalized === ADMIN_PASSCODE) {
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(DOCS_ADMIN_SESSION_KEY, '1');
      } catch {
        // Ignore session storage errors
      }
    }
    return true;
  }
  return false;
}

export function lockDocsAdmin() {
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(DOCS_ADMIN_SESSION_KEY);
    } catch {
      // Ignore session storage errors
    }
  }
}

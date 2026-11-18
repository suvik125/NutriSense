let sharedAudioCtx = null;

export function getBrowserNotificationPermission() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission || 'default';
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    const result = await Notification.requestPermission();
    return result || Notification.permission || 'default';
  } catch {
    return 'denied';
  }
}

export function triggerBrowserNotification({ title, message, category = 'System' }) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;
  try {
    new Notification(String(title || 'NutriSense Reminder'), {
      body: String(message || ''),
      tag: `nutrisense-${String(category || 'system').toLowerCase().replace(/\s+/g, '-')}`,
    });
    return true;
  } catch {
    return false;
  }
}

export function playNotificationChime() {
  if (typeof window === 'undefined') return false;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return false;
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended' && typeof sharedAudioCtx.resume === 'function') {
      sharedAudioCtx.resume().catch(() => {});
    }

    const now = sharedAudioCtx.currentTime;
    const notes = [
      { freq: 587.33, start: 0, dur: 0.16 }, // D5
      { freq: 880.0, start: 0.1, dur: 0.24 }, // A5
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.055, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    });
    return true;
  } catch {
    return false;
  }
}

export function triggerNotificationVibration(durationMs = 200) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }
  try {
    return Boolean(navigator.vibrate(durationMs));
  } catch {
    return false;
  }
}

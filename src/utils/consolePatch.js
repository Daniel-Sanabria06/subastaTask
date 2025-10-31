// Parche global para console.* con niveles y desduplicado
// Se aplica al inicio de la app para reducir ruido en consola

const LEVEL = (import.meta.env.VITE_LOG_LEVEL || 'error').toLowerCase();
const DEBUG = (import.meta.env.VITE_DEBUG_LOGS || '').toLowerCase() === 'true';

const levels = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };
const currentLevel = levels[LEVEL] ?? levels.error;

const recent = new Map();
const TTL_MS = 5000; // 5 segundos para desduplicado

const makeKey = (args) => {
  try {
    return JSON.stringify(args);
  } catch {
    return String(args?.[0] ?? 'unknown');
  }
};

const dedupe = (args) => {
  const key = makeKey(args);
  const now = Date.now();
  const last = recent.get(key) || 0;
  for (const [k, ts] of recent.entries()) {
    if (now - ts > TTL_MS) recent.delete(k);
  }
  if (now - last < TTL_MS) return false;
  recent.set(key, now);
  return true;
};

const shouldLog = (level) => {
  if (levels[level] < currentLevel) return false;
  // Permite logs con nivel configurado, independientemente de DEV/PROD
  if (LEVEL === 'none') return false;
  return true;
};

(function patchConsole() {
  // Evita aplicar el parche múltiples veces
  if (globalThis.__consolePatched) return;
  globalThis.__consolePatched = true;

  const original = {
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  const safeOutput = (origFn, level, ...args) => {
    try {
      if (!shouldLog(level)) return;
      if (!dedupe(args)) return;
      origFn(...args);
    } catch (err) {
      // Si algo falla en el parche, no bloquear la app
      try { original.error('consolePatch error:', err); } catch {}
    }
  };

  console.debug = (...args) => safeOutput(original.debug, 'debug', ...args);
  console.info = (...args) => safeOutput(original.info, 'info', ...args);
  console.warn = (...args) => safeOutput(original.warn, 'warn', ...args);
  console.error = (...args) => safeOutput(original.error, 'error', ...args);

  if (DEBUG) {
    original.info('[consolePatch] activo con nivel', LEVEL);
  }
})();
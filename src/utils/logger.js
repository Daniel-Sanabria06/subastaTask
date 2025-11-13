// Utilidad de logging con niveles, gating por entorno y desduplicado temporal
// =============================================================================

const LEVEL = (import.meta.env.VITE_LOG_LEVEL || (import.meta.env.DEV ? 'warn' : 'error')).toLowerCase();
const DEBUG = (import.meta.env.VITE_DEBUG_LOGS || '').toLowerCase() === 'true';

const levels = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };
const currentLevel = levels[LEVEL] ?? levels.error;

// Desduplicado simple: no repetir el mismo mensaje/objeto dentro de una ventana de tiempo
const recent = new Map();
const TTL_MS = 5000; // 5 segundos

const shouldLog = (level) => {
  // Solo log si el nivel es igual o superior y (estamos en DEV o DEBUG explícito)
  if (levels[level] < currentLevel) return false;
  if (!import.meta.env.DEV && !DEBUG) return false;
  return true;
};

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
  // limpiar entradas viejas
  for (const [k, ts] of recent.entries()) {
    if (now - ts > TTL_MS) recent.delete(k);
  }
  if (now - last < TTL_MS) return false; // duplicado reciente
  recent.set(key, now);
  return true;
};

const output = (fn, level, ...args) => {
  if (!shouldLog(level)) return;
  if (!dedupe(args)) return;
  fn(...args);
};

export const logger = {
  debug: (...args) => output(console.debug, 'debug', ...args),
  info: (...args) => output(console.info, 'info', ...args),
  warn: (...args) => output(console.warn, 'warn', ...args),
  error: (...args) => output(console.error, 'error', ...args)
};

export default logger;
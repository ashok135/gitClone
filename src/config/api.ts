/**
 * Dynamic API Base URL resolver with Auto-Detection:
 * 1. Checks if local backend (http://localhost:5000) is running and responsive.
 * 2. If local backend is running -> uses http://localhost:5000.
 * 3. If local backend is down or unreachable -> automatically falls back to the live backend URL.
 */

export const LOCAL_BACKEND_URL = 'http://localhost:5000';
export const LIVE_BACKEND_URL = (
  import.meta.env.VITE_API_URL || 'https://git-clone-backend-one.vercel.app'
).replace(/\/$/, '');

// Try reading previously verified state from sessionStorage for instant initial render
let activeApiUrl: string = (() => {
  if (typeof window !== 'undefined') {
    try {
      const saved = sessionStorage.getItem('mini_vercel_backend_choice');
      if (saved) return saved;
    } catch {}
  }
  // Safe default: live URL so nothing breaks if local port 5000 is not running
  return LIVE_BACKEND_URL;
})();

let lastCheckTime = 0;
const CACHE_TTL_MS = 8000; // Cache check result for 8 seconds
let activeProbePromise: Promise<string> | null = null;

/**
 * Pings http://localhost:5000/api/health with a 1-second timeout.
 * Returns true if port 5000 is open and healthy, false otherwise.
 */
export const checkLocalBackend = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const isLocalhostClient =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  // If page is on HTTPS and not localhost (e.g. deployed to Vercel), browsers block HTTP mixed content
  if (!isLocalhostClient && window.location.protocol === 'https:') {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${LOCAL_BACKEND_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return true;
    }
  } catch {
    // Port 5000 not running, connection refused, or timed out
  }

  return false;
};

/**
 * Asynchronously verifies whether local backend is active before returning URL.
 * Automatically switches between http://localhost:5000 and live backend URL.
 */
export const getVerifiedApiUrl = async (forceCheck = false): Promise<string> => {
  const now = Date.now();
  if (!forceCheck && now - lastCheckTime < CACHE_TTL_MS) {
    return activeApiUrl;
  }

  if (activeProbePromise) {
    return activeProbePromise;
  }

  activeProbePromise = (async () => {
    try {
      const isAlive = await checkLocalBackend();
      if (isAlive) {
        activeApiUrl = LOCAL_BACKEND_URL;
        console.log(`[API Config] Local backend is ACTIVE -> ${LOCAL_BACKEND_URL}`);
      } else {
        activeApiUrl = LIVE_BACKEND_URL;
        console.log(`[API Config] Local backend is not running -> using Live backend ${LIVE_BACKEND_URL}`);
      }

      try {
        sessionStorage.setItem('mini_vercel_backend_choice', activeApiUrl);
      } catch {}
    } finally {
      lastCheckTime = Date.now();
      activeProbePromise = null;
    }

    return activeApiUrl;
  })();

  return activeProbePromise;
};

/**
 * Synchronous getter returning the currently active/verified API URL.
 */
export const getApiUrl = (): string => {
  return activeApiUrl;
};

export const API_URL = getApiUrl();

// Run immediate auto-check on module load in browser
if (typeof window !== 'undefined') {
  getVerifiedApiUrl();
}

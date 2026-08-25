/**
 * Dynamic API Base URL resolver.
 * - When running on localhost / 127.0.0.1 -> uses local backend (http://localhost:5000)
 * - When running in production / deployed domain -> uses public backend URL
 */
export const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      return 'http://localhost:5000';
    }
  }

  return (
    import.meta.env.VITE_API_URL || 'https://git-clone-backend-one.vercel.app'
  );
};

export const API_URL = getApiUrl();

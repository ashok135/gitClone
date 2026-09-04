import { useState, useEffect, useCallback } from 'react';
import { type SandboxItem } from '../types/sandbox';
import { ProjectApi } from '../services/api/projectApi';

const STORAGE_KEY = 'mini_vercel_sandboxes';

export function useSandboxes() {
  const [sandboxes, setSandboxes] = useState<SandboxItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [fetching, setFetching] = useState(false);

  const refreshSandboxes = useCallback(async () => {
    setFetching(true);
    try {
      const remote = await ProjectApi.fetchSandboxes();
      if (remote && remote.length > 0) {
        setSandboxes(remote);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      }
    } catch (e) {
      console.error('Failed to refresh sandboxes:', e);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    refreshSandboxes();
  }, [refreshSandboxes]);

  const recordSandbox = useCallback((sandbox: SandboxItem) => {
    setSandboxes((prev) => {
      const filtered = prev.filter((s) => s.id !== sandbox.id);
      const updated = [sandbox, ...filtered];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateSandbox = useCallback((id: string, updates: Partial<SandboxItem>) => {
    setSandboxes((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const stopSandbox = useCallback(async (id: string) => {
    try {
      await ProjectApi.stopSandbox(id);
      updateSandbox(id, { status: 'stopped', url: null });
    } catch (err) {
      console.error('Error stopping sandbox:', err);
    }
  }, [updateSandbox]);

  const activeCount = sandboxes.filter(
    (s) =>
      s.status === 'live' ||
      s.status === 'cloning' ||
      s.status === 'installing' ||
      s.status === 'building' ||
      s.status === 'starting' ||
      s.status === 'unpacking'
  ).length;

  return {
    sandboxes,
    activeCount,
    fetching,
    refreshSandboxes,
    recordSandbox,
    updateSandbox,
    stopSandbox,
  };
}

import { useState, useEffect, useCallback } from 'react';
import type { SandboxItem } from '../types/sandbox';
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
        // Merge remote sandboxes with locally cached sandboxes
        setSandboxes((prev) => {
          const map = new Map<string, SandboxItem>();
          // Put local items first
          prev.forEach((s) => map.set(s.id, s));
          // Merge/overwrite with remote items
          remote.forEach((s) => {
            const existing = map.get(s.id);
            const resolvedName =
              existing?.repoName && !existing.repoName.startsWith('dep_')
                ? existing.repoName
                : s.repoName && !s.repoName.startsWith('dep_')
                ? s.repoName
                : existing?.repoName || s.repoName;

            map.set(s.id, {
              ...existing,
              ...s,
              repoName: resolvedName,
              url: s.url || existing?.url || null,
              port: s.port || existing?.port,
              expiresAt: s.expiresAt || existing?.expiresAt,
            });
          });

          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
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
      const existing = prev.find((s) => s.id === sandbox.id);
      const merged: SandboxItem = {
        ...existing,
        ...sandbox,
        repoName:
          sandbox.repoName && !sandbox.repoName.startsWith('dep_')
            ? sandbox.repoName
            : existing?.repoName || sandbox.repoName,
        url: sandbox.url || existing?.url || null,
        port: sandbox.port || existing?.port,
        expiresAt: sandbox.expiresAt || existing?.expiresAt,
        detectedEnv: sandbox.detectedEnv || existing?.detectedEnv,
      };
      const filtered = prev.filter((s) => s.id !== sandbox.id);
      const updated = [merged, ...filtered];
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
    // 1. Optimistically delete immediately from UI for 0ms lag
    setSandboxes((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // 2. Call backend asynchronously to terminate worker process
    try {
      await ProjectApi.stopSandbox(id);
    } catch (err) {
      console.error('Error stopping sandbox:', err);
    }
  }, []);

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

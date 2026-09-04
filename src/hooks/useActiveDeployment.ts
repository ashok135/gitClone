import { useState, useEffect, useCallback } from 'react';
import { type  ActiveDeployment } from '../types/deployment';
import {  type Repo } from '../types/repo';
import { type UploadedFilePayload } from '../types/upload';
import { type SandboxItem } from '../types/sandbox';
import { ProjectApi } from '../services/api/projectApi';

interface UseActiveDeploymentOptions {
  onSandboxUpdate?: (sandbox: SandboxItem) => void;
}

export function useActiveDeployment({ onSandboxUpdate }: UseActiveDeploymentOptions = {}) {
  const [activeDeployment, setActiveDeployment] = useState<ActiveDeployment | null>(null);
  const [isDeployingFiles, setIsDeployingFiles] = useState(false);

  // SSE & Polling listener for active deployment progress
  useEffect(() => {
    if (!activeDeployment?.id || activeDeployment.step >= 4 || activeDeployment.step < 0) {
      return;
    }

    let isSubscribed = true;
    let eventSource: EventSource | null = null;

    const handleUpdate = (data: any) => {
      setActiveDeployment((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          step: data.step !== undefined ? data.step : prev.step,
          status: data.status || prev.status,
          url: data.url !== undefined ? data.url : prev.url,
          error: data.error || prev.error,
          logs:
            data.logs && data.logs.length > (prev.logs?.length || 0)
              ? data.logs
              : data.logs || prev.logs,
          expiresAt: data.expiresAt || prev.expiresAt,
          detectedEnv: data.detectedEnv || prev.detectedEnv,
        };
      });

      if (onSandboxUpdate) {
        onSandboxUpdate({
          id: activeDeployment.id,
          repoName: activeDeployment.repo.name,
          repoUrl: activeDeployment.repo.url,
          isUpload: activeDeployment.repo.url === 'local-upload',
          status: data.status || 'live',
          step: data.step || 4,
          url: data.url,
          port: data.port,
          createdAt: new Date().toISOString(),
          expiresAt: data.expiresAt,
          detectedEnv: data.detectedEnv,
        });
      }
    };

    try {
      const streamUrl = ProjectApi.getStreamUrl(activeDeployment.id);
      eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleUpdate(data);

          if (data.step >= 4 || data.step < 0) {
            if (eventSource) eventSource.close();
          }
        } catch (err) {
          console.error('Failed to parse SSE chunk:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('SSE stream closed, relying on fallback polling:', err);
        if (eventSource) eventSource.close();
      };
    } catch (e) {
      console.warn('Could not initialize EventSource:', e);
    }

    // 2.5s polling fallback
    const pollInterval = setInterval(async () => {
      if (!isSubscribed) return;
      try {
        const data = await ProjectApi.fetchStatus(activeDeployment.id);
        if (data) {
          handleUpdate(data);
          if (data.step >= 4 || data.step < 0) {
            clearInterval(pollInterval);
            if (eventSource) eventSource.close();
          }
        }
      } catch (err) {
        console.error('Polling status error:', err);
      }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      if (eventSource) eventSource.close();
    };
  }, [activeDeployment?.id, onSandboxUpdate]);

  const startGitDeploy = useCallback(async (repo: Repo) => {
    setActiveDeployment({
      id: '',
      repo,
      step: 1,
      status: 'cloning',
      logs: [`[${new Date().toLocaleTimeString()}] Triggering build for ${repo.name}...`],
    });

    try {
      const res = await ProjectApi.triggerGitDeploy(repo.url, repo.name);
      if (res.ok) {
        setActiveDeployment((prev) =>
          prev
            ? {
                ...prev,
                id: res.data.deploymentId,
                logs: res.data.logs || prev.logs,
              }
            : null
        );

        if (onSandboxUpdate) {
          onSandboxUpdate({
            id: res.data.deploymentId,
            repoName: repo.name,
            repoUrl: repo.url,
            isUpload: false,
            status: 'cloning',
            step: 1,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setActiveDeployment((prev) =>
          prev
            ? {
                ...prev,
                step: -1,
                error: res.data?.error || 'Failed to start deployment',
                logs: [...prev.logs, `❌ Server error: ${res.data?.error || 'Failed'}`],
              }
            : null
        );
      }
    } catch (err: any) {
      setActiveDeployment((prev) =>
        prev
          ? {
              ...prev,
              step: -1,
              error: err.message || 'Could not connect to deployment server',
              logs: [...prev.logs, `❌ Connection error: ${err.message}`],
            }
          : null
      );
    }
  }, [onSandboxUpdate]);

  const startFilesDeploy = useCallback(
    async (repoName: string, files: UploadedFilePayload[], envVars?: string) => {
      setIsDeployingFiles(true);

      const mockRepo: Repo = {
        id: Date.now(),
        name: repoName,
        fullName: repoName,
        isPrivate: false,
        url: 'local-upload',
        description: `Uploaded folder project (${files.length} files)`,
        updatedAt: new Date().toISOString(),
      };

      setActiveDeployment({
        id: '',
        repo: mockRepo,
        step: 1,
        status: 'unpacking',
        logs: [
          `[${new Date().toLocaleTimeString()}] Uploading ${files.length} files to sandbox worker...`,
        ],
      });

      try {
        const res = await ProjectApi.triggerFilesDeploy(repoName, files, envVars);
        if (res.ok) {
          setActiveDeployment((prev) =>
            prev
              ? {
                  ...prev,
                  id: res.data.deploymentId,
                  logs: res.data.logs || prev.logs,
                }
              : null
          );

          if (onSandboxUpdate) {
            onSandboxUpdate({
              id: res.data.deploymentId,
              repoName,
              isUpload: true,
              status: 'unpacking',
              step: 1,
              createdAt: new Date().toISOString(),
            });
          }
        } else {
          setActiveDeployment((prev) =>
            prev
              ? {
                  ...prev,
                  step: -1,
                  error: res.data?.error || 'Failed to deploy files',
                  logs: [...prev.logs, `❌ Server error: ${res.data?.error || 'Failed'}`],
                }
              : null
          );
        }
      } catch (err: any) {
        setActiveDeployment((prev) =>
          prev
            ? {
                ...prev,
                step: -1,
                error: err.message || 'Could not connect to deployment server',
                logs: [...prev.logs, `❌ Connection error: ${err.message}`],
              }
            : null
        );
      } finally {
        setIsDeployingFiles(false);
      }
    },
    [onSandboxUpdate]
  );

  const stopCurrentDeploy = useCallback(async () => {
    if (!activeDeployment?.id) return;
    try {
      await ProjectApi.stopSandbox(activeDeployment.id);
      setActiveDeployment((prev) =>
        prev
          ? {
              ...prev,
              step: -99,
              status: 'stopped',
              url: undefined,
              logs: [...prev.logs, '[Terminated] Sandbox stopped and files deleted from VM disk.'],
            }
          : null
      );
    } catch (e) {
      console.error('Failed to stop deployment:', e);
    }
  }, [activeDeployment?.id]);

  const viewSandboxLogs = useCallback((sandbox: SandboxItem) => {
    setActiveDeployment({
      id: sandbox.id,
      repo: {
        id: Date.now(),
        name: sandbox.repoName,
        fullName: sandbox.repoName,
        isPrivate: false,
        url: sandbox.repoUrl || 'uploaded-project',
        description: '',
        updatedAt: sandbox.createdAt,
      },
      step: sandbox.step || (sandbox.status === 'live' ? 4 : 1),
      status: sandbox.status,
      url: sandbox.url || undefined,
      logs: sandbox.logs || [`[Info] Connected to logs for sandbox ${sandbox.id}`],
      expiresAt: sandbox.expiresAt,
      detectedEnv: sandbox.detectedEnv,
    });
  }, []);

  return {
    activeDeployment,
    setActiveDeployment,
    isDeployingFiles,
    startGitDeploy,
    startFilesDeploy,
    stopCurrentDeploy,
    viewSandboxLogs,
  };
}

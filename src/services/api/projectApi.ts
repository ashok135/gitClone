import { getApiUrl } from '../../config/api';
import { type UploadedFilePayload } from '../../types/upload';
import {type SandboxItem } from '../../types/sandbox';

export class ProjectApi {
  private static getHeaders() {
    const token = localStorage.getItem('oauth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async triggerGitDeploy(repositoryUrl: string, repoName?: string, envVars?: any) {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/project/run`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ repositoryUrl, repoName, envVars }),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  static async triggerFilesDeploy(repoName: string, files: UploadedFilePayload[], envVars?: any) {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/project/upload-deploy`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ repoName, files, envVars }),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  static async fetchSandboxes(): Promise<SandboxItem[]> {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/project/sandboxes`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.sandboxes) ? data.sandboxes : [];
  }

  static async stopSandbox(id: string) {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/project/stop/${id}`, {
      method: 'POST',
    });
    return res.ok;
  }

  static async fetchStatus(id: string) {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/project/status/${id}`);
    if (!res.ok) return null;
    return res.json();
  }

  static getStreamUrl(id: string): string {
    const apiUrl = getApiUrl();
    return `${apiUrl}/api/project/stream/${id}`;
  }
}
